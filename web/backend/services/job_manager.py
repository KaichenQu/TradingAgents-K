import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Optional
from uuid import uuid4

from ..models.job import JobRequest
from . import job_store


class Job:
    def __init__(self, job_id: str, request: JobRequest):
        self.job_id = job_id
        self.request = request
        self.status = "queued"
        self.created_at = time.time()
        self.error_message: Optional[str] = None
        self.final_decision: Optional[str] = None
        self.final_state: Optional[dict] = None
        self.ws_queues: Dict[str, asyncio.Queue] = {}
        self._cancelled = False
        self.processor = None


class JobManager:
    def __init__(self):
        self._jobs: Dict[str, Job] = {}
        self._executor = ThreadPoolExecutor(max_workers=4)

    def create_job(self, request: JobRequest) -> str:
        job_id = str(uuid4())
        self._jobs[job_id] = Job(job_id, request)
        return job_id

    def get_job(self, job_id: str) -> Optional[Job]:
        return self._jobs.get(job_id)

    def set_status(self, job_id: str, status: str):
        job = self._jobs.get(job_id)
        if job:
            job.status = status

    def set_error(self, job_id: str, message: str):
        job = self._jobs.get(job_id)
        if not job:
            return
        job.status = "error"
        job.error_message = message
        job_store.save_job(
            job_id=job_id,
            ticker=job.request.ticker,
            analysis_date=job.request.analysis_date,
            status="error",
            created_at=job.created_at,
            error_message=message,
            report_sections=job.processor.report_sections if job.processor else {},
        )

    def set_complete(self, job_id: str, final_decision: Optional[str], final_state: dict):
        job = self._jobs.get(job_id)
        if not job:
            return
        job.status = "completed"
        job.final_decision = final_decision
        job.final_state = final_state
        report_sections = job.processor.report_sections if job.processor else {}
        job_store.save_job(
            job_id=job_id,
            ticker=job.request.ticker,
            analysis_date=job.request.analysis_date,
            status="completed",
            created_at=job.created_at,
            final_decision=final_decision,
            report_sections=report_sections,
        )

    def is_cancelled(self, job_id: str) -> bool:
        job = self._jobs.get(job_id)
        return job._cancelled if job else True

    def cancel(self, job_id: str):
        job = self._jobs.get(job_id)
        if job:
            job._cancelled = True

    def add_ws(self, job_id: str, ws_id: str) -> asyncio.Queue:
        job = self._jobs.get(job_id)
        if not job:
            raise ValueError(f"Job {job_id} not found")
        q: asyncio.Queue = asyncio.Queue()
        job.ws_queues[ws_id] = q
        return q

    def remove_ws(self, job_id: str, ws_id: str):
        job = self._jobs.get(job_id)
        if job:
            job.ws_queues.pop(ws_id, None)

    def broadcast(self, job_id: str, msg: dict):
        job = self._jobs.get(job_id)
        if not job:
            return
        for q in list(job.ws_queues.values()):
            try:
                q.put_nowait(msg)
            except asyncio.QueueFull:
                pass

    def get_snapshot(self, job_id: str) -> dict:
        job = self._jobs.get(job_id)

        # Fall back to SQLite if job not in memory (e.g. after server restart)
        if not job:
            stored = job_store.get_job(job_id)
            if not stored:
                return {}
            return {
                "job_id": job_id,
                "status": stored["status"],
                "ticker": stored["ticker"],
                "analysis_date": stored["analysis_date"],
                "agent_statuses": {},
                "report_sections": stored["report_sections"],
                "stats": {},
                "messages": [],
                "final_decision": stored.get("final_decision"),
                "error_message": stored.get("error_message"),
                "elapsed_seconds": 0.0,
            }

        base = {
            "job_id": job_id,
            "status": job.status,
            "ticker": job.request.ticker,
            "analysis_date": job.request.analysis_date,
            "agent_statuses": {},
            "report_sections": {},
            "stats": {},
            "messages": [],
            "final_decision": job.final_decision,
            "error_message": job.error_message,
            "elapsed_seconds": time.time() - job.created_at,
        }
        if job.processor:
            snap = job.processor.get_snapshot()
            base["agent_statuses"] = snap["agent_statuses"]
            base["report_sections"] = snap["report_sections"]
            base["stats"] = snap["stats"]
        return base

    @property
    def executor(self):
        return self._executor


job_manager = JobManager()
