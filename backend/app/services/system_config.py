"""System configuration storage and management.

Stores LLM API keys, provider settings, and other user-configurable options
in the database so they can be managed through the frontend UI.
"""

import json
from typing import Any

from app.db import SessionLocal
from app.models import SystemConfigRecord

LLM_PROVIDERS = {
    "openai": {
        "name": "OpenAI",
        "api_base": "https://api.openai.com/v1",
        "models": ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo"],
        "protocol": "openai",
    },
    "deepseek": {
        "name": "DeepSeek",
        "api_base": "https://api.deepseek.com/v1",
        "models": ["deepseek-chat", "deepseek-coder"],
        "protocol": "openai",
    },
    "claude": {
        "name": "Claude (Anthropic)",
        "api_base": "https://api.anthropic.com/v1",
        "models": ["claude-sonnet-4-5", "claude-3-5-haiku"],
        "protocol": "anthropic",
    },
    "moonshot": {
        "name": "Moonshot (Kimi)",
        "api_base": "https://api.moonshot.cn/v1",
        "models": ["moonshot-v1-8k", "moonshot-v1-32k"],
        "protocol": "openai",
    },
    "zhipu": {
        "name": "智谱 (GLM)",
        "api_base": "https://open.bigmodel.cn/api/paas/v4",
        "models": ["glm-4", "glm-4-flash"],
        "protocol": "openai",
    },
    "qwen": {
        "name": "通义千问",
        "api_base": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "models": ["qwen-turbo", "qwen-plus", "qwen-max"],
        "protocol": "openai",
    },
    "custom": {
        "name": "自定义 OpenAI 兼容接口",
        "api_base": "",
        "models": [],
        "protocol": "openai",
    },
}


def get_config(key: str) -> str | None:
    with SessionLocal() as session:
        row = session.query(SystemConfigRecord).filter_by(key=key).first()
        return row.value if row else None


def set_config(key: str, value: str) -> None:
    with SessionLocal() as session:
        row = session.query(SystemConfigRecord).filter_by(key=key).first()
        if row:
            row.value = value
        else:
            session.add(SystemConfigRecord(key=key, value=value))
        session.commit()


def get_llm_config() -> dict[str, Any]:
    raw = get_config("llm_config")
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return {
        "provider": "openai",
        "api_key": "",
        "api_base": "",
        "model": "gpt-4o-mini",
        "enabled": False,
    }


def set_llm_config(config: dict[str, Any]) -> dict[str, Any]:
    provider = config.get("provider", "openai")
    if provider not in LLM_PROVIDERS:
        provider = "openai"

    provider_info = LLM_PROVIDERS[provider]
    api_base = config.get("api_base") or provider_info["api_base"]
    model = config.get("model") or (provider_info["models"][0] if provider_info["models"] else "")

    stored = {
        "provider": provider,
        "api_key": config.get("api_key", ""),
        "api_base": api_base,
        "model": model,
        "enabled": bool(config.get("api_key")),
    }
    set_config("llm_config", json.dumps(stored, ensure_ascii=False))
    return stored


def get_system_api_key() -> str | None:
    return get_config("system_api_key")


def set_system_api_key(api_key: str) -> None:
    set_config("system_api_key", api_key)


def get_shopee_credentials() -> dict[str, Any]:
    raw = get_config("shopee_credentials")
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return {
        "client_id": "",
        "client_secret": "",
        "authorized": False,
        "shop_id": "",
        "shop_name": "",
        "access_token": "",
        "refresh_token": "",
    }


def set_shopee_credentials(credentials: dict[str, Any]) -> None:
    set_config("shopee_credentials", json.dumps(credentials, ensure_ascii=False))


def get_1688_credentials() -> dict[str, Any]:
    raw = get_config("alibaba_credentials")
    if raw:
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            pass
    return {
        "client_id": "",
        "client_secret": "",
        "authorized": False,
        "member_id": "",
        "access_token": "",
        "refresh_token": "",
    }


def set_1688_credentials(credentials: dict[str, Any]) -> None:
    set_config("alibaba_credentials", json.dumps(credentials, ensure_ascii=False))


def get_full_config_status() -> dict[str, Any]:
    llm = get_llm_config()
    shopee = get_shopee_credentials()
    alibaba = get_1688_credentials()

    return {
        "llm": {
            "provider": llm.get("provider", ""),
            "api_base": llm.get("api_base", ""),
            "model": llm.get("model", ""),
            "enabled": llm.get("enabled", False),
            "has_api_key": bool(llm.get("api_key")),
        },
        "shopee": {
            "authorized": shopee.get("authorized", False),
            "shop_id": shopee.get("shop_id", ""),
            "shop_name": shopee.get("shop_name", ""),
            "has_credentials": bool(shopee.get("client_id")),
        },
        "alibaba_1688": {
            "authorized": alibaba.get("authorized", False),
            "has_credentials": bool(alibaba.get("client_id")),
        },
        "system_api_key_set": bool(get_system_api_key()),
        "ready_for_production": (
            llm.get("enabled", False)
            and shopee.get("authorized", False)
            and bool(get_system_api_key())
        ),
    }
