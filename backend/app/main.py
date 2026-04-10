from fastapi import FastAPI

import app.models  # noqa: F401
from app.api.routes import router
from app.core.config import settings
from app.db import init_db


app = FastAPI(title=settings.app_name, debug=settings.app_debug)
app.include_router(router)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "env": settings.app_env}
