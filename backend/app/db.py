import logging
from collections.abc import Generator
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings

logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models"""
    pass


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    """Get SQLAlchemy engine with optimized configuration"""
    database_uri = settings.sqlalchemy_database_uri
    logger.debug(f"Creating database engine with URI: {database_uri}")
    
    if database_uri == "sqlite+pysqlite:///:memory":
        logger.debug("Using in-memory SQLite database for testing")
        return create_engine(
            database_uri,
            future=True,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    
    # Production database configuration
    logger.debug("Using production database configuration")
    return create_engine(
        database_uri,
        future=True,
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_pre_ping=True,
        pool_use_lifo=True,
        echo=False,  # Set to True for SQL debugging
    )


@lru_cache(maxsize=1)
def get_session_factory() -> sessionmaker[Session]:
    """Get session factory with optimized settings"""
    logger.debug("Creating session factory")
    return sessionmaker(
        bind=get_engine(), 
        autoflush=False, 
        autocommit=False, 
        future=True,
        expire_on_commit=False,  # Improves performance by not expiring objects after commit
    )


def SessionLocal() -> Session:
    """Create a new database session"""
    return get_session_factory()()


def get_db_session() -> Generator[Session, None, None]:
    """Dependency to get database session with proper error handling"""
    session = SessionLocal()
    try:
        yield session
        session.commit()
        logger.debug("Database transaction committed successfully")
    except SQLAlchemyError as e:
        session.rollback()
        logger.error(f"Database transaction failed: {e}")
        raise
    except Exception as e:
        session.rollback()
        logger.error(f"Unexpected error in database session: {e}")
        raise
    finally:
        session.close()
        logger.debug("Database session closed")


def reset_db_connection_state() -> None:
    """Reset database connection state (useful for testing)"""
    logger.debug("Resetting database connection state")
    get_session_factory.cache_clear()
    get_engine.cache_clear()
    logger.debug("Database connection state reset")


def init_db() -> None:
    """Initialize database by creating all tables"""
    try:
        logger.info("Initializing database...")
        engine = get_engine()
        Base.metadata.create_all(bind=engine)
        logger.info("Database initialized successfully")
    except SQLAlchemyError as e:
        logger.error(f"Failed to initialize database: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during database initialization: {e}")
        raise
