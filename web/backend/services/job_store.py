"""SQLite persistence for completed jobs.

Lives at ~/.tradingagents/web_jobs.db — zero infra, project already uses
SQLite for LangGraph checkpoints in the same directory.
"""
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

_DB_PATH = Path.home() / ".tradingagents" / "web_jobs.db"


def _connect() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id        TEXT PRIMARY KEY,
                ticker        TEXT NOT NULL,
                analysis_date TEXT NOT NULL,
                status        TEXT NOT NULL,
                final_decision TEXT,
                report_sections TEXT DEFAULT '{}',
                error_message TEXT,
                created_at    TEXT NOT NULL,
                completed_at  TEXT
            )
        """)
        conn.commit()


def save_job(
    *,
    job_id: str,
    ticker: str,
    analysis_date: str,
    status: str,
    created_at: float,
    final_decision: Optional[str] = None,
    report_sections: Optional[Dict[str, str]] = None,
    error_message: Optional[str] = None,
) -> None:
    now = datetime.now().isoformat()
    created_iso = datetime.fromtimestamp(created_at).isoformat()
    with _connect() as conn:
        conn.execute("""
            INSERT OR REPLACE INTO jobs
            (job_id, ticker, analysis_date, status, final_decision,
             report_sections, error_message, created_at, completed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            job_id, ticker, analysis_date, status, final_decision,
            json.dumps(report_sections or {}), error_message,
            created_iso, now,
        ))
        conn.commit()


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM jobs WHERE job_id = ?", (job_id,)
        ).fetchone()
    if not row:
        return None
    d = dict(row)
    d["report_sections"] = json.loads(d.get("report_sections") or "{}")
    return d


def get_recent(limit: int = 30) -> List[Dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT job_id, ticker, analysis_date, status, final_decision, created_at, completed_at "
            "FROM jobs ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(r) for r in rows]
