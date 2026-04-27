import json
import os
import re
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from ..services.job_manager import job_manager

router = APIRouter(prefix="/api/jobs")

_PROVIDER_ENV_MAP = {
    "openai":     "OPENAI_API_KEY",
    "anthropic":  "ANTHROPIC_API_KEY",
    "xai":        "XAI_API_KEY",
    "deepseek":   "DEEPSEEK_API_KEY",
    "qwen":       "DASHSCOPE_API_KEY",
    "glm":        "ZHIPU_API_KEY",
    "openrouter": "OPENROUTER_API_KEY",
    "azure":      "AZURE_OPENAI_API_KEY",
    "xinghu":     "XINGHU_API_KEY",
    "ollama":     None,
    "google":     "GOOGLE_API_KEY",
}

_PROVIDER_BASE_URL = {
    "openai":     "https://api.openai.com/v1",
    "xai":        "https://api.x.ai/v1",
    "deepseek":   "https://api.deepseek.com",
    "qwen":       "https://dashscope.aliyuncs.com/compatible-mode/v1",
    "glm":        "https://open.bigmodel.cn/api/paas/v4/",
    "openrouter": "https://openrouter.ai/api/v1",
    "ollama":     "http://localhost:11434/v1",
    "xinghu":     "https://xinghuapi.com/v1",
}

_DEFAULT_PROVIDER = "xinghu"
_DEFAULT_MODEL    = "claude-sonnet-4-6"
_DEFAULT_BASE_URL = "https://xinghuapi.com/v1"

_SECTION_TITLES = {
    "market_report":          "Market Analysis",
    "sentiment_report":       "Social Sentiment Analysis",
    "news_report":            "News Analysis",
    "fundamentals_report":    "Fundamentals Analysis",
    "investment_plan":        "Research Debate",
    "trader_investment_plan": "Trader Proposal",
    "final_trade_decision":   "Risk Analysis & Portfolio Decision",
}

_VISUAL_PROMPT = """You are a senior financial analyst. Read the following report and return ONLY a valid JSON object — no markdown, no prose, no code fences.

Use exactly this structure:
{{
  "stance": "BULLISH" | "BEARISH" | "NEUTRAL",
  "stance_color": "success" | "danger" | "warning",
  "headline": "one punchy sentence (≤ 15 words) capturing the core conclusion",
  "summary": "2-3 sentence plain-language explanation of the main argument",
  "key_concerns": ["≤12-word concern", ...],
  "key_strengths": ["≤12-word strength", ...],
  "highlights": [
    {{"label": "Risk Level",   "value": "HIGH",   "color": "danger"}},
    {{"label": "Valuation",   "value": "Stretched","color": "warning"}},
    ...
  ],
  "recommendation": "one clear actionable sentence"
}}

Rules:
- stance: exactly BULLISH, BEARISH, or NEUTRAL
- stance_color: success for BULLISH, danger for BEARISH, warning for NEUTRAL
- key_concerns: 3–5 items
- key_strengths: 2–4 items
- highlights: 4–6 key metrics, each color is "success", "danger", "warning", or "neutral"
- Return raw JSON only

Section: {section_title}
Ticker: {ticker}

Report:
{content}"""


class VisualizeRequest(BaseModel):
    section: str


def _extract_json(text: str) -> dict:
    text = text.strip()
    # Strip markdown fences if present
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text.strip())


@router.post("/{job_id}/visualize")
async def visualize_section(job_id: str, req: VisualizeRequest):
    snap = job_manager.get_snapshot(job_id)
    if not snap:
        raise HTTPException(status_code=404, detail="Job not found")

    report_sections: dict = snap.get("report_sections", {})
    ticker: str = snap.get("ticker", "")
    content = report_sections.get(req.section, "")
    if not content or not content.strip():
        raise HTTPException(status_code=400, detail="Section has no content yet")

    job = job_manager.get_job(job_id)
    if job and job.request:
        provider  = (job.request.llm_provider or _DEFAULT_PROVIDER).lower()
        model     = job.request.quick_think_llm or _DEFAULT_MODEL
        api_key   = job.request.api_key or ""
        base_url  = job.request.backend_url or _PROVIDER_BASE_URL.get(provider, _DEFAULT_BASE_URL)
    else:
        provider  = _DEFAULT_PROVIDER
        model     = _DEFAULT_MODEL
        api_key   = ""
        base_url  = _DEFAULT_BASE_URL

    if not api_key:
        env_key = _PROVIDER_ENV_MAP.get(provider)
        if env_key:
            api_key = os.environ.get(env_key, "")

    if not api_key and provider != "ollama":
        raise HTTPException(status_code=400, detail=f"No API key for provider '{provider}'")

    section_title = _SECTION_TITLES.get(req.section, req.section)
    prompt = _VISUAL_PROMPT.format(
        section_title=section_title,
        ticker=ticker,
        content=content[:8000],
    )

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key or "ollama", base_url=base_url)
        response = client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2048,
            temperature=0.1,
        )
        raw = (response.choices[0].message.content or "").strip()
        data = _extract_json(raw)
        return {"data": data}
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"LLM call failed: {exc}")
