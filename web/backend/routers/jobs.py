import asyncio

from fastapi import APIRouter, HTTPException

from ..models.job import JobRequest, JobResponse
from ..services.job_manager import job_manager
from ..services.graph_runner import run_graph
from ..services import job_store

router = APIRouter(prefix="/api/jobs")


@router.post("", response_model=JobResponse)
async def create_job(req: JobRequest):
    job_id = job_manager.create_job(req)
    loop = asyncio.get_event_loop()
    loop.run_in_executor(job_manager.executor, run_graph, job_id, req, loop)
    return JobResponse(job_id=job_id, status="queued")


@router.get("/recent")
async def recent_jobs():
    return {"jobs": job_store.get_recent(30)}


@router.get("/{job_id}")
async def get_job(job_id: str):
    snap = job_manager.get_snapshot(job_id)  # falls back to SQLite
    if not snap:
        raise HTTPException(status_code=404, detail="Job not found")
    return snap


@router.get("/{job_id}/report")
async def get_report(job_id: str):
    # Try in-memory first, then SQLite
    job = job_manager.get_job(job_id)
    if job:
        if job.status != "completed" or not job.final_state:
            raise HTTPException(status_code=400, detail="Job not completed yet")
        state = job.final_state
        sections = _build_report(state)
        return {"report": "\n\n---\n\n".join(sections)}

    stored = job_store.get_job(job_id)
    if not stored:
        raise HTTPException(status_code=404, detail="Job not found")
    if stored["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not completed yet")
    sections = _build_report(stored["report_sections"])
    return {"report": "\n\n---\n\n".join(sections)}


def _build_report(state: dict) -> list:
    order = [
        ("market_report",          "Market Analysis"),
        ("sentiment_report",       "Social Sentiment"),
        ("news_report",            "News Analysis"),
        ("fundamentals_report",    "Fundamentals"),
        ("investment_plan",        "Research Debate"),
        ("trader_investment_plan", "Trader Proposal"),
        ("final_trade_decision",   "Risk & Decision"),
    ]
    sections = []
    for key, title in order:
        content = state.get(key) or ""
        if isinstance(content, dict):
            import json
            content = json.dumps(content, indent=2)
        if content and str(content).strip():
            sections.append(f"# {title}\n\n{content}")
    return sections


@router.delete("/{job_id}")
async def cancel_job(job_id: str):
    job = job_manager.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    job_manager.cancel(job_id)
    return {"status": "cancelled"}
