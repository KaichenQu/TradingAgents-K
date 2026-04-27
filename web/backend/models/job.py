from typing import List, Optional
from pydantic import BaseModel


class JobRequest(BaseModel):
    ticker: str
    analysis_date: str
    research_depth: int = 5  # 1=quick, 5=deep
    analysts: List[str] = ["market", "social", "news", "fundamentals"]
    output_language: str = "English"
    api_key: str = ""
    # Optional provider overrides — defaults to xinghu/claude-sonnet-4-6
    llm_provider: Optional[str] = None
    backend_url: Optional[str] = None
    quick_think_llm: Optional[str] = None
    deep_think_llm: Optional[str] = None


class JobResponse(BaseModel):
    job_id: str
    status: str


class JobSnapshot(BaseModel):
    job_id: str
    status: str
    ticker: str
    analysis_date: str
    agent_statuses: dict
    report_sections: dict
    stats: dict
    messages: list
    final_decision: Optional[str] = None
    error_message: Optional[str] = None
    elapsed_seconds: float = 0.0
