import asyncio
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from cli.stats_handler import StatsCallbackHandler
from tradingagents.graph.trading_graph import TradingAgentsGraph
from tradingagents.default_config import DEFAULT_CONFIG

from ..models.job import JobRequest
from .chunk_processor import ChunkProcessor
from .job_manager import job_manager

_PROVIDER = "xinghu"
_MODEL    = "claude-sonnet-4-6"
_BASE_URL = "https://xinghuapi.com/v1"

_PROVIDER_ENV_MAP = {
    "openai":     "OPENAI_API_KEY",
    "anthropic":  "ANTHROPIC_API_KEY",
    "google":     "GOOGLE_API_KEY",
    "xai":        "XAI_API_KEY",
    "deepseek":   "DEEPSEEK_API_KEY",
    "qwen":       "DASHSCOPE_API_KEY",
    "glm":        "ZHIPU_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "azure":      "AZURE_OPENAI_API_KEY",
    "ollama":     None,
    "xinghu":     "XINGHU_API_KEY",
}


def _build_config(req: JobRequest) -> dict:
    config = DEFAULT_CONFIG.copy()
    config["llm_provider"]    = req.llm_provider or _PROVIDER
    config["quick_think_llm"] = req.quick_think_llm or _MODEL
    config["deep_think_llm"]  = req.deep_think_llm or _MODEL
    config["backend_url"]     = req.backend_url or _BASE_URL
    config["max_debate_rounds"]      = req.research_depth
    config["max_risk_discuss_rounds"] = req.research_depth
    config["output_language"] = req.output_language
    config["checkpoint_enabled"] = False
    return config


def run_graph(job_id: str, req: JobRequest, loop: asyncio.AbstractEventLoop):
    """Synchronous function executed in a ThreadPoolExecutor worker."""
    provider = (req.llm_provider or _PROVIDER).lower()
    env_key  = _PROVIDER_ENV_MAP.get(provider)
    old_val  = os.environ.get(env_key) if env_key else None
    if env_key and req.api_key:
        os.environ[env_key] = req.api_key

    try:
        loop.call_soon_threadsafe(
            job_manager.broadcast, job_id,
            {"type": "job_status", "job_id": job_id, "status": "running", "elapsed_seconds": 0.0}
        )
        job_manager.set_status(job_id, "running")

        config    = _build_config(req)
        stats     = StatsCallbackHandler()
        processor = ChunkProcessor(req.analysts, stats)

        job = job_manager.get_job(job_id)
        if job:
            job.processor = processor

        graph = TradingAgentsGraph(
            selected_analysts=req.analysts,
            config=config,
            debug=False,
            callbacks=[stats],
        )

        init_state = graph.propagator.create_initial_state(req.ticker, req.analysis_date)
        args       = graph.propagator.get_graph_args(callbacks=[stats])

        final_chunk = None
        for chunk in graph.graph.stream(init_state, **args):
            if job_manager.is_cancelled(job_id):
                break
            msgs = processor.process(chunk)
            for msg in msgs:
                loop.call_soon_threadsafe(job_manager.broadcast, job_id, msg)
            final_chunk = chunk

        decision = None
        if final_chunk and final_chunk.get("final_trade_decision"):
            decision = graph.process_signal(final_chunk["final_trade_decision"])

        job_manager.set_complete(job_id, decision, final_chunk or {})
        elapsed = time.time() - (job.created_at if job else time.time())
        loop.call_soon_threadsafe(
            job_manager.broadcast, job_id,
            {"type": "complete", "final_decision": decision, "elapsed_seconds": elapsed}
        )

    except Exception as e:
        job_manager.set_error(job_id, str(e))
        loop.call_soon_threadsafe(
            job_manager.broadcast, job_id,
            {"type": "error", "message": str(e)}
        )
    finally:
        if env_key and req.api_key:
            if old_val is None:
                os.environ.pop(env_key, None)
            else:
                os.environ[env_key] = old_val
