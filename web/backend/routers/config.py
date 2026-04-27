import sys
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from tradingagents.llm_clients.model_catalog import get_model_options, MODEL_OPTIONS

router = APIRouter(prefix="/api/config")

PROVIDERS = [
    {"key": "openai",     "display": "OpenAI",          "base_url": "https://api.openai.com/v1",   "api_key_env": "OPENAI_API_KEY"},
    {"key": "anthropic",  "display": "Anthropic",        "base_url": "https://api.anthropic.com/",  "api_key_env": "ANTHROPIC_API_KEY"},
    {"key": "google",     "display": "Google",           "base_url": None,                           "api_key_env": "GOOGLE_API_KEY"},
    {"key": "xai",        "display": "xAI",              "base_url": "https://api.x.ai/v1",         "api_key_env": "XAI_API_KEY"},
    {"key": "deepseek",   "display": "DeepSeek",         "base_url": "https://api.deepseek.com",    "api_key_env": "DEEPSEEK_API_KEY"},
    {"key": "qwen",       "display": "Qwen",             "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1", "api_key_env": "DASHSCOPE_API_KEY"},
    {"key": "glm",        "display": "GLM",              "base_url": "https://open.bigmodel.cn/api/paas/v4/", "api_key_env": "ZHIPU_API_KEY"},
    {"key": "openrouter", "display": "OpenRouter",       "base_url": "https://openrouter.ai/api/v1", "api_key_env": "OPENROUTER_API_KEY"},
    {"key": "azure",      "display": "Azure OpenAI",     "base_url": None,                           "api_key_env": "AZURE_OPENAI_API_KEY"},
    {"key": "ollama",     "display": "Ollama",           "base_url": "http://localhost:11434/v1",    "api_key_env": None},
    {"key": "xinghu",     "display": "星狐API (XinghuAPI)", "base_url": "https://xinghuapi.com/v1", "api_key_env": "XINGHU_API_KEY"},
]

GOOGLE_THINKING_OPTIONS = [
    {"value": "high", "label": "High"},
    {"value": "minimal", "label": "Minimal"},
    {"value": None, "label": "Default"},
]

OPENAI_EFFORT_OPTIONS = [
    {"value": "high", "label": "High"},
    {"value": "medium", "label": "Medium"},
    {"value": "low", "label": "Low"},
]

ANTHROPIC_EFFORT_OPTIONS = [
    {"value": "high", "label": "High"},
    {"value": "medium", "label": "Medium"},
    {"value": "low", "label": "Low"},
]


@router.get("/providers")
def get_providers():
    return {"providers": PROVIDERS}


@router.get("/models")
def get_models(provider: str = Query(...), mode: str = Query(...)):
    try:
        options = get_model_options(provider.lower(), mode.lower())
        return {"models": [{"display": d, "value": v} for d, v in options]}
    except KeyError:
        return {"models": []}


@router.get("/provider-options")
def get_provider_options(provider: str = Query(...)):
    p = provider.lower()
    if p == "google":
        return {"type": "google_thinking", "options": GOOGLE_THINKING_OPTIONS}
    if p == "openai":
        return {"type": "openai_reasoning_effort", "options": OPENAI_EFFORT_OPTIONS}
    if p == "anthropic":
        return {"type": "anthropic_effort", "options": ANTHROPIC_EFFORT_OPTIONS}
    return {"type": None, "options": []}
