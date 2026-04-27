import asyncio
from uuid import uuid4

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..services.job_manager import job_manager

router = APIRouter()


@router.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    job = job_manager.get_job(job_id)

    # Job not in memory — try SQLite (server restart or page refresh)
    if not job:
        snap = job_manager.get_snapshot(job_id)  # falls back to SQLite internally
        if not snap:
            await websocket.close(code=4004)
            return
        await websocket.accept()
        await websocket.send_json({"type": "snapshot", **snap})
        if snap.get("status") == "completed":
            await websocket.send_json({
                "type": "complete",
                "final_decision": snap.get("final_decision"),
                "elapsed_seconds": snap.get("elapsed_seconds", 0),
            })
        elif snap.get("status") == "error":
            await websocket.send_json({"type": "error", "message": snap.get("error_message", "")})
        return

    await websocket.accept()
    ws_id = str(uuid4())
    queue = job_manager.add_ws(job_id, ws_id)

    # Send current snapshot immediately (reconnect support)
    snap = job_manager.get_snapshot(job_id)
    await websocket.send_json({"type": "snapshot", **snap})

    # Already finished — send final event and close
    if job.status in ("completed", "error"):
        if job.status == "completed":
            await websocket.send_json({
                "type": "complete",
                "final_decision": job.final_decision,
                "elapsed_seconds": snap.get("elapsed_seconds", 0),
            })
        else:
            await websocket.send_json({"type": "error", "message": job.error_message or ""})
        job_manager.remove_ws(job_id, ws_id)
        return

    try:
        while True:
            try:
                msg = await asyncio.wait_for(queue.get(), timeout=30.0)
                await websocket.send_json(msg)
                if msg.get("type") in ("complete", "error"):
                    break
            except asyncio.TimeoutError:
                await websocket.send_json({"type": "ping"})
    except WebSocketDisconnect:
        pass
    finally:
        job_manager.remove_ws(job_id, ws_id)
