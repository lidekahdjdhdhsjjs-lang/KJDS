# Backend conftest.py: patch SQLite path to use dev.db with all tables
import os
from pathlib import Path

# Get the backend directory (parent of this conftest's directory)
backend_dir = Path(__file__).parent
project_root = backend_dir.parent

# Patch settings so tests use the dev.db that has all tables + migrations
import app.core.config

from app.core.config import Settings

dev_db = str(backend_dir / "dev.db")
patched = Settings(sqlite_path=dev_db)
object.__setattr__(app.core.config, "settings", patched)
