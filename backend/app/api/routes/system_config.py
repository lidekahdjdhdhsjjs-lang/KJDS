"""System configuration API routes.

Provides endpoints for managing LLM provider settings, Shopee/1688 OAuth credentials,
and system API key through the frontend configuration center.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import system_config as config_svc

router = APIRouter(tags=["system-config"])


class LLMConfigRequest(BaseModel):
    provider: str = Field(default="openai")
    api_key: str = Field(default="")
    api_base: str = Field(default="")
    model: str = Field(default="")


class LLMConfigResponse(BaseModel):
    provider: str
    api_base: str
    model: str
    enabled: bool
    has_api_key: bool


class ShopeeCredentialsRequest(BaseModel):
    client_id: str = Field(default="")
    client_secret: str = Field(default="")


class Alibaba1688CredentialsRequest(BaseModel):
    client_id: str = Field(default="")
    client_secret: str = Field(default="")


class SystemApiKeyRequest(BaseModel):
    api_key: str = Field(default="")


class ConfigStatusResponse(BaseModel):
    llm: LLMConfigResponse
    shopee: dict
    alibaba_1688: dict
    system_api_key_set: bool
    ready_for_production: bool


class LLMProvidersResponse(BaseModel):
    providers: dict


@router.get("/system-config/status", response_model=ConfigStatusResponse)
def get_config_status():
    status = config_svc.get_full_config_status()
    return status


@router.get("/system-config/llm", response_model=LLMConfigResponse)
def get_llm_config():
    cfg = config_svc.get_llm_config()
    return LLMConfigResponse(
        provider=cfg.get("provider", "openai"),
        api_base=cfg.get("api_base", ""),
        model=cfg.get("model", ""),
        enabled=cfg.get("enabled", False),
        has_api_key=bool(cfg.get("api_key")),
    )


@router.post("/system-config/llm", response_model=LLMConfigResponse)
def save_llm_config(req: LLMConfigRequest):
    stored = config_svc.set_llm_config(req.model_dump())
    return LLMConfigResponse(
        provider=stored["provider"],
        api_base=stored["api_base"],
        model=stored["model"],
        enabled=stored["enabled"],
        has_api_key=bool(stored.get("api_key")),
    )


@router.get("/system-config/llm/providers", response_model=LLMProvidersResponse)
def get_llm_providers():
    return LLMProvidersResponse(providers=config_svc.LLM_PROVIDERS)


@router.get("/system-config/shopee")
def get_shopee_config():
    creds = config_svc.get_shopee_credentials()
    return {
        "authorized": creds.get("authorized", False),
        "shop_id": creds.get("shop_id", ""),
        "shop_name": creds.get("shop_name", ""),
        "has_credentials": bool(creds.get("client_id")),
    }


@router.post("/system-config/shopee/credentials")
def save_shopee_credentials(req: ShopeeCredentialsRequest):
    existing = config_svc.get_shopee_credentials()
    updated = {
        **existing,
        "client_id": req.client_id,
        "client_secret": req.client_secret,
    }
    config_svc.set_shopee_credentials(updated)
    return {
        "authorized": updated.get("authorized", False),
        "has_credentials": bool(req.client_id),
    }


@router.post("/system-config/shopee/authorize")
def start_shopee_authorization():
    creds = config_svc.get_shopee_credentials()
    if not creds.get("client_id"):
        raise HTTPException(status_code=400, detail="请先填写 Shopee Client ID 和 Client Secret")

    from app.core.config import settings
    authorize_url = (
        f"{settings.shopee_auth_url}"
        f"?partner_id={creds['client_id']}"
        f"&redirect={settings.shopee_redirect_uri}"
        f"&response_type=code"
    )
    return {"authorize_url": authorize_url, "status": "pending"}


@router.post("/system-config/shopee/callback")
def shopee_oauth_callback(code: str = "", shop_id: int = 0):
    creds = config_svc.get_shopee_credentials()
    updated = {
        **creds,
        "authorized": True,
        "shop_id": str(shop_id) if shop_id else creds.get("shop_id", ""),
        "access_token": code,
    }
    config_svc.set_shopee_credentials(updated)
    return {"authorized": True, "shop_id": updated["shop_id"]}


@router.post("/system-config/shopee/disconnect")
def disconnect_shopee():
    creds = config_svc.get_shopee_credentials()
    updated = {
        **creds,
        "authorized": False,
        "access_token": "",
        "refresh_token": "",
    }
    config_svc.set_shopee_credentials(updated)
    return {"authorized": False}


@router.get("/system-config/1688")
def get_1688_config():
    creds = config_svc.get_1688_credentials()
    return {
        "authorized": creds.get("authorized", False),
        "has_credentials": bool(creds.get("client_id")),
    }


@router.post("/system-config/1688/credentials")
def save_1688_credentials(req: Alibaba1688CredentialsRequest):
    existing = config_svc.get_1688_credentials()
    updated = {
        **existing,
        "client_id": req.client_id,
        "client_secret": req.client_secret,
    }
    config_svc.set_1688_credentials(updated)
    return {
        "authorized": updated.get("authorized", False),
        "has_credentials": bool(req.client_id),
    }


@router.post("/system-config/1688/authorize")
def start_1688_authorization():
    creds = config_svc.get_1688_credentials()
    if not creds.get("client_id"):
        raise HTTPException(status_code=400, detail="请先填写 1688 App Key 和 App Secret")

    from app.core.config import settings
    authorize_url = (
        f"{settings.alibaba_auth_url}"
        f"/{creds['client_id']}"
        f"?redirect_uri={settings.alibaba_redirect_uri}"
    )
    return {"authorize_url": authorize_url, "status": "pending"}


@router.post("/system-config/1688/callback")
def alibaba_1688_oauth_callback(code: str = ""):
    creds = config_svc.get_1688_credentials()
    updated = {
        **creds,
        "authorized": True,
        "access_token": code,
    }
    config_svc.set_1688_credentials(updated)
    return {"authorized": True}


@router.post("/system-config/1688/disconnect")
def disconnect_1688():
    creds = config_svc.get_1688_credentials()
    updated = {
        **creds,
        "authorized": False,
        "access_token": "",
        "refresh_token": "",
    }
    config_svc.set_1688_credentials(updated)
    return {"authorized": False}


@router.get("/system-config/api-key")
def get_api_key_status():
    return {"is_set": bool(config_svc.get_system_api_key())}


@router.post("/system-config/api-key")
def save_api_key(req: SystemApiKeyRequest):
    config_svc.set_system_api_key(req.api_key)
    return {"is_set": bool(req.api_key)}
