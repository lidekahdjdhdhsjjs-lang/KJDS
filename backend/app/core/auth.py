from typing import Literal, cast

from fastapi import Header, HTTPException, Query, status
from pydantic import BaseModel

from app.core.config import settings

Role = Literal["operator", "reviewer", "admin"]
VALID_ROLES: tuple[Role, ...] = ("operator", "reviewer", "admin")


class CurrentActor(BaseModel):
    operator_id: str
    role: Role


def require_roles(*allowed_roles: Role):
    async def dependency(
        x_operator_id: str | None = Header(default=None),
        x_operator_role: str | None = Header(default=None),
        api_key: str | None = Query(default=None, alias="api_key"),
        authorization: str | None = Header(default=None),
    ) -> CurrentActor:
        if api_key and settings.api_key and api_key == settings.api_key:
            return CurrentActor(operator_id="api-key-user", role="admin")

        if authorization and authorization.startswith("Bearer "):
            token = authorization[7:]
            if settings.api_key and token == settings.api_key:
                return CurrentActor(operator_id="api-key-user", role="admin")

        if settings.allow_header_auth:
            operator_id = x_operator_id.strip() if x_operator_id else ""
            operator_role = x_operator_role.strip() if x_operator_role else ""

            if not operator_id or not operator_role:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Missing operator identity headers. Provide x-operator-id and x-operator-role, or use api_key / Bearer token.",
                )

            if operator_role not in VALID_ROLES:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid operator role header",
                )

            if operator_role not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Operator role is not allowed for this action",
                )

            return CurrentActor(operator_id=operator_id, role=cast(Role, operator_role))

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Provide api_key query parameter, Bearer token, or operator headers.",
        )

    return dependency


require_operator = require_roles("operator", "reviewer", "admin")
require_reviewer = require_roles("reviewer", "admin")
require_admin = require_roles("admin")
