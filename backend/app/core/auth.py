import logging
from hmac import compare_digest
from typing import Literal, cast, Optional

from fastapi import Header, HTTPException, Query, status, Request
from pydantic import BaseModel, Field

from app.core.config import settings

logger = logging.getLogger(__name__)

Role = Literal["operator", "reviewer", "admin"]
VALID_ROLES: tuple[Role, ...] = ("operator", "reviewer", "admin")


class CurrentActor(BaseModel):
    """Current authenticated actor"""
    operator_id: str = Field(..., description="Unique identifier for the operator")
    role: Role = Field(..., description="Role of the operator")
    authentication_method: str = Field(..., description="Method used for authentication")


def require_roles(*allowed_roles: Role):
    """Dependency factory to require specific roles for endpoint access"""
    async def dependency(
        request: Request,
        x_operator_id: Optional[str] = Header(default=None, alias="x-operator-id"),
        x_operator_role: Optional[str] = Header(default=None, alias="x-operator-role"),
        api_key: Optional[str] = Query(default=None, alias="api_key"),
        authorization: Optional[str] = Header(default=None),
    ) -> CurrentActor:
        # Log authentication attempt
        client_ip = request.client.host if request.client else "unknown"
        logger.info(f"Authentication attempt from {client_ip} to {request.url.path}")
        
        # API Key authentication
        if api_key:
            logger.debug("Attempting API key authentication")
            if settings.api_key and compare_digest(api_key, settings.api_key):
                logger.info("API key authentication successful")
                return CurrentActor(
                    operator_id="api-key-user", 
                    role="admin",
                    authentication_method="api_key"
                )
            logger.warning("Invalid API key provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key",
            )

        # Bearer token authentication
        if authorization and authorization.startswith("Bearer "):
            logger.debug("Attempting Bearer token authentication")
            token = authorization[7:]
            if settings.api_key and compare_digest(token, settings.api_key):
                logger.info("Bearer token authentication successful")
                return CurrentActor(
                    operator_id="bearer-token-user", 
                    role="admin",
                    authentication_method="bearer_token"
                )
            logger.warning("Invalid Bearer token provided")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid Bearer token",
            )

        # Header-based authentication (development only)
        if settings.allow_header_auth:
            logger.debug("Attempting header-based authentication")
            operator_id = x_operator_id.strip() if x_operator_id else ""
            operator_role = x_operator_role.strip() if x_operator_role else ""

            if not operator_id or not operator_role:
                logger.warning("Missing operator identity headers")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing operator identity headers. Provide x-operator-id and x-operator-role, or use api_key / Bearer token.",
                )

            if operator_role not in VALID_ROLES:
                logger.warning(f"Invalid operator role: {operator_role}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid operator role header",
                )

            if operator_role not in allowed_roles:
                logger.warning(f"Role {operator_role} not allowed for this action")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operator role is not allowed for this action",
                )

            logger.info(f"Header-based authentication successful for {operator_id} with role {operator_role}")
            return CurrentActor(
                operator_id=operator_id, 
                role=cast(Role, operator_role),
                authentication_method="header"
            )

        # No authentication method provided
        logger.warning("No authentication method provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide api_key query parameter, Bearer token, or operator headers.",
        )

    return dependency


# Pre-defined role requirements
require_operator = require_roles("operator", "reviewer", "admin")
require_reviewer = require_roles("reviewer", "admin")
require_admin = require_roles("admin")


def verify_api_key(api_key: str) -> bool:
    """Verify API key with constant-time comparison"""
    return settings.api_key and compare_digest(api_key, settings.api_key)
