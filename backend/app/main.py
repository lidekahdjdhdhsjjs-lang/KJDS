import logging
import logging.config
from contextlib import asynccontextmanager
import time
from collections.abc import AsyncIterator
from typing import Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError

import app.models  # noqa: F401
from app.api.routes import router
from app.core.config import settings
from app.db import init_db
from app.schemas.common import ApiResponse

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s | %(levelname)-8s | %(name)s:%(lineno)d | %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
        "access": {
            "format": "%(asctime)s | %(levelname)-8s | %(client_addr)s - %(request_line)s - %(status_code)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "level": "DEBUG" if settings.app_debug else "INFO",
            "formatter": "default",
            "stream": "ext://sys.stderr",
        },
    },
    "loggers": {
        "app": {"level": "DEBUG" if settings.app_debug else "INFO", "handlers": ["console"], "propagate": False},
        "uvicorn": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "uvicorn.access": {"level": "INFO", "handlers": ["console"], "propagate": False},
        "sqlalchemy.engine": {"level": "WARNING", "handlers": ["console"], "propagate": False},
    },
    "root": {"level": "INFO", "handlers": ["console"]},
}
logging.config.dictConfig(LOGGING_CONFIG)

logger = logging.getLogger(__name__)


def _validate_production_secrets() -> None:
    """Fail fast if required production secrets are missing."""
    if settings.app_env != "production":
        return
    missing: list[str] = []
    if not settings.api_key or settings.api_key == "change-me-in-production":
        missing.append("api_key")
    if not settings.token_encryption_key:
        missing.append("token_encryption_key")
    if not settings.session_secret_key or settings.session_secret_key == "change-me-in-production":
        missing.append("session_secret_key")
    if missing:
        raise RuntimeError(
            f"Production secrets not configured: {', '.join(missing)}. "
            "Set these in environment variables or .env file before starting in production."
        )


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    _validate_production_secrets()
    init_db()
    logger.info(f"Starting {settings.app_name} in {settings.app_env} mode")
    yield
    # Shutdown (if needed)
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.app_name,
    debug=settings.app_debug,
    lifespan=lifespan,
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers_middleware(request: Request, call_next: Callable[[Request], AsyncIterator[Response]]) -> Response:
    """Add security headers to all responses."""
    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    return response


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next: Callable[[Request], AsyncIterator[Response]]) -> Response:
    """Log request timing and basic info."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    # Log slow requests
    if process_time > 1.0:
        logger.warning(
            f"Slow request: {request.method} {request.url.path} took {process_time:.2f}s"
        )

    response.headers["X-Process-Time"] = f"{process_time:.3f}"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with consistent response format."""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"],
        })
    logger.warning(f"Validation error: {errors}")
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "data": None,
            "error": "Validation failed",
            "details": errors,
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle ValueError exceptions (business logic errors)."""
    logger.warning(f"Business logic error: {str(exc)}")
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "data": None,
            "error": str(exc),
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "data": None,
            "error": "Internal server error" if not settings.app_debug else str(exc),
        },
    )


app.include_router(router)


@app.get("/")
async def root() -> dict[str, str]:
    return {"name": settings.app_name, "env": settings.app_env}
