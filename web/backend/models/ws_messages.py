from typing import Any, Optional
from pydantic import BaseModel


class WsJobStatus(BaseModel):
    type: str = "job_status"
    job_id: str
    status: str
    elapsed_seconds: float = 0.0
    error_message: Optional[str] = None


class WsAgentStatus(BaseModel):
    type: str = "agent_status"
    agent: str
    status: str
    team: str


class WsMessage(BaseModel):
    type: str = "message"
    timestamp: str
    msg_type: str
    content: str


class WsToolCall(BaseModel):
    type: str = "tool_call"
    timestamp: str
    tool_name: str
    args: Any


class WsReportUpdate(BaseModel):
    type: str = "report_update"
    section: str
    content: str
    section_title: str


class WsStats(BaseModel):
    type: str = "stats"
    llm_calls: int = 0
    tool_calls: int = 0
    tokens_in: int = 0
    tokens_out: int = 0
    agents_done: int = 0
    agents_total: int = 0
    reports_done: int = 0
    reports_total: int = 0
    elapsed_seconds: float = 0.0


class WsComplete(BaseModel):
    type: str = "complete"
    final_decision: Optional[str] = None
    elapsed_seconds: float = 0.0


class WsError(BaseModel):
    type: str = "error"
    message: str
