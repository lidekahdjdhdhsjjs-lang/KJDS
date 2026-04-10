from typing import Literal, cast

from fastapi import Header, HTTPException, status
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
    ) -> CurrentActor:
        if not settings.allow_header_auth:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Header-based auth is disabled outside development",
            )

        operator_id = x_operator_id.strip() if x_operator_id else ""
        operator_role = x_operator_role.strip() if x_operator_role else ""

        if not operator_id or not operator_role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing operator identity headers",
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

    return dependency
