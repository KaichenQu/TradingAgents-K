import ast
import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, HumanMessage, ToolMessage

ANALYST_ORDER = ["market", "social", "news", "fundamentals"]
ANALYST_AGENT_NAMES = {
    "market": "Market Analyst",
    "social": "Social Analyst",
    "news": "News Analyst",
    "fundamentals": "Fundamentals Analyst",
}
ANALYST_REPORT_MAP = {
    "market": "market_report",
    "social": "sentiment_report",
    "news": "news_report",
    "fundamentals": "fundamentals_report",
}

AGENT_TEAM_MAP = {
    "Market Analyst": "Analyst Team",
    "Social Analyst": "Analyst Team",
    "News Analyst": "Analyst Team",
    "Fundamentals Analyst": "Analyst Team",
    "Bull Researcher": "Research Team",
    "Bear Researcher": "Research Team",
    "Research Manager": "Research Team",
    "Trader": "Trading Team",
    "Aggressive Analyst": "Risk Management",
    "Conservative Analyst": "Risk Management",
    "Neutral Analyst": "Risk Management",
    "Portfolio Manager": "Portfolio Management",
}

REPORT_SECTION_TITLES = {
    "market_report": "Market Analysis",
    "sentiment_report": "Social Sentiment",
    "news_report": "News Analysis",
    "fundamentals_report": "Fundamentals",
    "investment_plan": "Research Debate",
    "trader_investment_plan": "Trader Proposal",
    "final_trade_decision": "Risk & Decision",
}


def _is_empty(val) -> bool:
    if val is None or val == "":
        return True
    if isinstance(val, str):
        s = val.strip()
        if not s:
            return True
        try:
            return not bool(ast.literal_eval(s))
        except (ValueError, SyntaxError):
            return False
    return not bool(val)


def _extract_content(content) -> Optional[str]:
    if _is_empty(content):
        return None
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, dict):
        text = content.get("text", "")
        return text.strip() if not _is_empty(text) else None
    if isinstance(content, list):
        parts = []
        for item in content:
            if isinstance(item, dict) and item.get("type") == "text":
                t = item.get("text", "").strip()
                if t and not _is_empty(t):
                    parts.append(t)
            elif isinstance(item, str) and item.strip():
                parts.append(item.strip())
        result = " ".join(parts)
        return result if result else None
    s = str(content).strip()
    return s if not _is_empty(s) else None


def _classify_message(message):
    content = _extract_content(getattr(message, "content", None))
    if isinstance(message, HumanMessage):
        if content and content.strip() == "Continue":
            return "Control", content
        return "User", content
    if isinstance(message, ToolMessage):
        return "Data", content
    if isinstance(message, AIMessage):
        return "Agent", content
    return "System", content


class ChunkProcessor:
    def __init__(self, selected_analysts: List[str], stats_handler):
        self.selected_analysts = selected_analysts
        self.stats_handler = stats_handler
        self.start_time = time.time()

        # Agent status tracking
        self.agent_status: Dict[str, str] = {}
        for key in selected_analysts:
            name = ANALYST_AGENT_NAMES.get(key, key)
            self.agent_status[name] = "pending"
        for agent in [
            "Bull Researcher", "Bear Researcher", "Research Manager",
            "Trader",
            "Aggressive Analyst", "Conservative Analyst", "Neutral Analyst",
            "Portfolio Manager",
        ]:
            self.agent_status[agent] = "pending"

        # Report section tracking
        self.report_sections: Dict[str, str] = {}
        self.processed_message_ids: set = set()

    def _now(self) -> str:
        return datetime.now().strftime("%H:%M:%S")

    def _set_agent(self, agent: str, status: str, out: list):
        if self.agent_status.get(agent) != status:
            self.agent_status[agent] = status
            out.append({
                "type": "agent_status",
                "agent": agent,
                "status": status,
                "team": AGENT_TEAM_MAP.get(agent, ""),
            })

    def _update_report(self, section: str, content: str, out: list):
        if content and content.strip():
            prev = self.report_sections.get(section, "")
            new_content = content if len(content) > len(prev) else prev
            if new_content != prev:
                self.report_sections[section] = new_content
                out.append({
                    "type": "report_update",
                    "section": section,
                    "content": new_content,
                    "section_title": REPORT_SECTION_TITLES.get(section, section),
                })

    def process(self, chunk: Dict[str, Any]) -> List[dict]:
        out: List[dict] = []

        # 1. Process messages
        for message in chunk.get("messages", []):
            msg_id = getattr(message, "id", None)
            if msg_id is not None:
                if msg_id in self.processed_message_ids:
                    continue
                self.processed_message_ids.add(msg_id)

            msg_type, content = _classify_message(message)
            if content and content.strip() and msg_type != "Control":
                out.append({
                    "type": "message",
                    "timestamp": self._now(),
                    "msg_type": msg_type,
                    "content": content[:500],
                })

            if hasattr(message, "tool_calls") and message.tool_calls:
                for tc in message.tool_calls:
                    if isinstance(tc, dict):
                        name, args = tc.get("name", ""), tc.get("args", {})
                    else:
                        name, args = tc.name, tc.args
                    out.append({
                        "type": "tool_call",
                        "timestamp": self._now(),
                        "tool_name": name,
                        "args": args,
                    })

        # 2. Analyst statuses
        found_active = False
        for key in ANALYST_ORDER:
            if key not in self.selected_analysts:
                continue
            agent_name = ANALYST_AGENT_NAMES[key]
            report_key = ANALYST_REPORT_MAP[key]

            if chunk.get(report_key):
                self._update_report(report_key, chunk[report_key], out)

            has_report = bool(self.report_sections.get(report_key))
            if has_report:
                self._set_agent(agent_name, "completed", out)
            elif not found_active:
                self._set_agent(agent_name, "in_progress", out)
                found_active = True
            else:
                self._set_agent(agent_name, "pending", out)

        if not found_active and self.selected_analysts:
            if self.agent_status.get("Bull Researcher") == "pending":
                self._set_agent("Bull Researcher", "in_progress", out)

        # 3. Research team
        if chunk.get("investment_debate_state"):
            debate = chunk["investment_debate_state"]
            bull = debate.get("bull_history", "").strip()
            bear = debate.get("bear_history", "").strip()
            judge = debate.get("judge_decision", "").strip()

            if bull or bear:
                self._set_agent("Bull Researcher", "in_progress", out)
                self._set_agent("Bear Researcher", "in_progress", out)
            if bull:
                self._update_report("investment_plan", f"### Bull Researcher Analysis\n{bull}", out)
            if bear:
                self._update_report("investment_plan", f"### Bear Researcher Analysis\n{bear}", out)
            if judge:
                self._update_report("investment_plan", f"### Research Manager Decision\n{judge}", out)
                self._set_agent("Bull Researcher", "completed", out)
                self._set_agent("Bear Researcher", "completed", out)
                self._set_agent("Research Manager", "completed", out)
                self._set_agent("Trader", "in_progress", out)

        # 4. Trading team
        if chunk.get("trader_investment_plan"):
            self._update_report("trader_investment_plan", chunk["trader_investment_plan"], out)
            if self.agent_status.get("Trader") != "completed":
                self._set_agent("Trader", "completed", out)
                self._set_agent("Aggressive Analyst", "in_progress", out)

        # 5. Risk team
        if chunk.get("risk_debate_state"):
            risk = chunk["risk_debate_state"]
            agg = risk.get("aggressive_history", "").strip()
            con = risk.get("conservative_history", "").strip()
            neu = risk.get("neutral_history", "").strip()
            judge = risk.get("judge_decision", "").strip()

            if agg:
                self._set_agent("Aggressive Analyst", "in_progress", out)
                self._update_report("final_trade_decision", f"### Aggressive Analyst Analysis\n{agg}", out)
            if con:
                self._set_agent("Conservative Analyst", "in_progress", out)
                self._update_report("final_trade_decision", f"### Conservative Analyst Analysis\n{con}", out)
            if neu:
                self._set_agent("Neutral Analyst", "in_progress", out)
                self._update_report("final_trade_decision", f"### Neutral Analyst Analysis\n{neu}", out)
            if judge:
                self._update_report("final_trade_decision", f"### Portfolio Manager Decision\n{judge}", out)
                for agent in ["Aggressive Analyst", "Conservative Analyst", "Neutral Analyst", "Portfolio Manager"]:
                    self._set_agent(agent, "completed", out)

        # 6. Stats
        stats = self.stats_handler.get_stats()
        agents_done = sum(1 for s in self.agent_status.values() if s == "completed")
        reports_done = sum(1 for v in self.report_sections.values() if v)
        out.append({
            "type": "stats",
            **stats,
            "agents_done": agents_done,
            "agents_total": len(self.agent_status),
            "reports_done": reports_done,
            "reports_total": 7,
            "elapsed_seconds": time.time() - self.start_time,
        })

        return out

    def get_snapshot(self) -> dict:
        stats = self.stats_handler.get_stats()
        return {
            "agent_statuses": {
                agent: {"status": status, "team": AGENT_TEAM_MAP.get(agent, "")}
                for agent, status in self.agent_status.items()
            },
            "report_sections": self.report_sections,
            "stats": {
                **stats,
                "agents_done": sum(1 for s in self.agent_status.values() if s == "completed"),
                "agents_total": len(self.agent_status),
                "reports_done": sum(1 for v in self.report_sections.values() if v),
                "reports_total": 7,
                "elapsed_seconds": time.time() - self.start_time,
            },
        }
