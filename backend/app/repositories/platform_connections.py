from datetime import UTC, datetime, timedelta
from uuid import uuid4

from sqlalchemy import select

from app.core.config import settings
from app.db import SessionLocal
from app.models import (
    DecisionAuditLogRecord,
    IncidentRecord,
    PlatformConnectionRecord,
    StoreAuthorizationRecord,
    StoreHealthStatusRecord,
    StoreRecord,
)
from app.schemas.platform_connections import (
    PlatformConnectionStatus,
    PlatformName,
    StoreAuthorizationView,
    StoreHealthStatusView,
    StoreView,
)

PLATFORM_ORDER: tuple[PlatformName, ...] = ("shopee", "1688")
STATE_TTL = timedelta(minutes=15)


def _serialize_capabilities(capabilities: list[str]) -> str | None:
    if not capabilities:
        return None
    return ",".join(capabilities)


def _deserialize_capabilities(capabilities: str | None) -> list[str]:
    if not capabilities:
        return []
    return [item for item in capabilities.split(",") if item]


def _default_connection(platform: PlatformName) -> PlatformConnectionStatus:
    authorized = settings.shopee_authorized if platform == "shopee" else settings.alibaba_authorized
    account_label = None
    shop_name = None
    capabilities: list[str] = []
    if authorized:
        account_label = "Shopee store" if platform == "shopee" else "1688 supplier account"
        shop_name = account_label
        capabilities = ["read_products", "read_shop"]
        if platform == "shopee":
            capabilities.append("publish_listings")

    return PlatformConnectionStatus(
        platform=platform,
        connected=authorized,
        status="connected" if authorized else "disconnected",
        account_label=account_label,
        shop_name=shop_name,
        last_connected_at=datetime.now(UTC).isoformat() if authorized else None,
        capabilities=capabilities,
    )


def _default_store_id(platform: PlatformName) -> str:
    return f"{platform}-default-store"


def _default_store_name(platform: PlatformName) -> str:
    return "Shopee default store" if platform == "shopee" else "1688 default store"


def _serialize(record: PlatformConnectionRecord) -> PlatformConnectionStatus:
    return PlatformConnectionStatus(
        platform=record.platform,
        connected=record.connected,
        status=record.status,
        account_label=record.account_label,
        account_id=record.account_id,
        shop_id=record.shop_id,
        shop_name=record.shop_name,
        token_expires_at=record.token_expires_at.isoformat() if record.token_expires_at else None,
        last_connected_at=record.last_connected_at.isoformat() if record.last_connected_at else None,
        last_error=record.last_error,
        authorize_url=record.authorize_url,
        capabilities=_deserialize_capabilities(record.capabilities),
    )


def _serialize_store(record: StoreRecord) -> StoreView:
    return StoreView(
        id=record.id,
        platform=record.platform,
        external_shop_id=record.external_shop_id,
        name=record.name,
        site=record.site,
        timezone=record.timezone,
        status=record.status,
        created_at=record.created_at.isoformat(),
        updated_at=record.updated_at.isoformat(),
    )


def _serialize_authorization(record: StoreAuthorizationRecord) -> StoreAuthorizationView:
    return StoreAuthorizationView(
        id=record.id,
        store_id=record.store_id,
        platform=record.platform,
        provider=record.provider,
        connected=record.connected,
        status=record.status,
        account_label=record.account_label,
        account_id=record.account_id,
        shop_id=record.shop_id,
        shop_name=record.shop_name,
        token_expires_at=record.token_expires_at.isoformat() if record.token_expires_at else None,
        last_connected_at=record.last_connected_at.isoformat() if record.last_connected_at else None,
        last_error=record.last_error,
        authorize_url=record.authorize_url,
        capabilities=_deserialize_capabilities(record.capabilities),
        updated_at=record.updated_at.isoformat(),
    )


def _serialize_health(record: StoreHealthStatusRecord) -> StoreHealthStatusView:
    return StoreHealthStatusView(
        store_id=record.store_id,
        platform=record.platform,
        auth_status=record.auth_status,
        publish_status=record.publish_status,
        incident_status=record.incident_status,
        overall_status=record.overall_status,
        auth_message=record.auth_message,
        last_checked_at=record.last_checked_at.isoformat(),
        updated_at=record.updated_at.isoformat(),
    )


def _get_or_create_store(session, platform: PlatformName) -> StoreRecord:
    store_id = _default_store_id(platform)
    store = session.get(StoreRecord, store_id)
    if store is None:
        store = StoreRecord(
            id=store_id,
            platform=platform,
            external_shop_id=None,
            name=_default_store_name(platform),
            site=None,
            timezone="UTC",
            status="active",
        )
        session.add(store)
        session.flush()
    return store


def _get_or_create_health(session, store_id: str, platform: PlatformName) -> StoreHealthStatusRecord:
    health = session.get(StoreHealthStatusRecord, store_id)
    if health is None:
        health = StoreHealthStatusRecord(
            store_id=store_id,
            platform=platform,
            auth_status="disconnected",
            publish_status="ready",
            incident_status="clear",
            overall_status="warning",
            auth_message=None,
            last_checked_at=datetime.now(UTC),
        )
        session.add(health)
        session.flush()
    return health


def _get_or_create_authorization(session, platform: PlatformName) -> tuple[StoreRecord, StoreAuthorizationRecord]:
    store = _get_or_create_store(session, platform)
    authorization = session.scalar(
        select(StoreAuthorizationRecord).where(StoreAuthorizationRecord.platform == platform)
    )
    if authorization is None:
        authorization = StoreAuthorizationRecord(
            id=f"auth-{platform}",
            store_id=store.id,
            platform=platform,
            provider=platform,
            connected=False,
            status="disconnected",
        )
        session.add(authorization)
        session.flush()
    _get_or_create_health(session, store.id, platform)
    return store, authorization


def _sync_legacy_connection(
    session,
    connection: PlatformConnectionStatus,
    *,
    pending_state: str | None = None,
    access_token: str | None = None,
    refresh_token: str | None = None,
) -> PlatformConnectionRecord:
    record = session.get(PlatformConnectionRecord, connection.platform)
    if record is None:
        record = PlatformConnectionRecord(platform=connection.platform)
        session.add(record)

    record.connected = connection.connected
    record.status = connection.status
    record.account_label = connection.account_label
    record.account_id = connection.account_id
    record.shop_id = connection.shop_id
    record.shop_name = connection.shop_name
    record.token_expires_at = datetime.fromisoformat(connection.token_expires_at) if connection.token_expires_at else None
    record.last_connected_at = datetime.fromisoformat(connection.last_connected_at) if connection.last_connected_at else None
    record.last_error = connection.last_error
    record.authorize_url = connection.authorize_url
    record.pending_state = pending_state
    record.access_token = access_token
    record.refresh_token = refresh_token
    record.capabilities = _serialize_capabilities(connection.capabilities)
    session.flush()
    return record


def _write_audit_log(session, *, store_id: str, entity_type: str, entity_id: str, action: str, summary: str) -> None:
    session.add(
        DecisionAuditLogRecord(
            id=f"audit-{uuid4().hex}",
            store_id=store_id,
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor_type="system",
            actor_id=None,
            summary=summary,
        )
    )


def _write_incident(session, *, store_id: str, platform: PlatformName, code: str, title: str, detail: str | None) -> None:
    session.add(
        IncidentRecord(
            id=f"incident-{uuid4().hex}",
            store_id=store_id,
            platform=platform,
            severity="warning",
            status="open",
            code=code,
            title=title,
            detail=detail,
        )
    )


def _build_connection_from_authorization(authorization: StoreAuthorizationRecord) -> PlatformConnectionStatus:
    return PlatformConnectionStatus(
        platform=authorization.platform,
        connected=authorization.connected,
        status=authorization.status,
        account_label=authorization.account_label,
        account_id=authorization.account_id,
        shop_id=authorization.shop_id,
        shop_name=authorization.shop_name,
        token_expires_at=authorization.token_expires_at.isoformat() if authorization.token_expires_at else None,
        last_connected_at=authorization.last_connected_at.isoformat() if authorization.last_connected_at else None,
        last_error=authorization.last_error,
        authorize_url=authorization.authorize_url,
        capabilities=_deserialize_capabilities(authorization.capabilities),
    )


def _ensure_platform_records(session, platform: PlatformName) -> PlatformConnectionStatus:
    store, authorization = _get_or_create_authorization(session, platform)
    health = _get_or_create_health(session, store.id, platform)
    default_connection = _default_connection(platform)

    # Only initialize from defaults if the authorization has never been touched
    # (status is the initial "disconnected" and last_connected_at has never been set)
    if authorization.last_connected_at is None and authorization.status == "disconnected" and not authorization.connected:
        authorization.connected = default_connection.connected
        authorization.status = default_connection.status
        authorization.account_label = default_connection.account_label
        authorization.account_id = default_connection.account_id
        authorization.shop_id = default_connection.shop_id
        authorization.shop_name = default_connection.shop_name
        authorization.token_expires_at = None
        authorization.last_connected_at = (
            datetime.fromisoformat(default_connection.last_connected_at) if default_connection.last_connected_at else None
        )
        authorization.last_error = None
        authorization.authorize_url = None
        authorization.pending_state = None
        authorization.pending_state_expires_at = None
        authorization.access_token_ciphertext = None
        authorization.refresh_token_ciphertext = None
        authorization.capabilities = _serialize_capabilities(default_connection.capabilities)
        health.auth_status = default_connection.status
        health.auth_message = None
        health.incident_status = "clear"
        health.overall_status = "healthy" if default_connection.connected else "warning"
        health.last_checked_at = datetime.now(UTC)

    connection = _build_connection_from_authorization(authorization)
    _sync_legacy_connection(session, connection, pending_state=authorization.pending_state)
    session.flush()
    return connection


def reset_platform_connections() -> None:
    with SessionLocal() as session:
        session.query(DecisionAuditLogRecord).delete()
        session.query(IncidentRecord).delete()
        session.query(StoreHealthStatusRecord).delete()
        session.query(StoreAuthorizationRecord).delete()
        session.query(StoreRecord).delete()
        session.query(PlatformConnectionRecord).delete()
        session.commit()
        for platform in PLATFORM_ORDER:
            _ensure_platform_records(session, platform)
        session.commit()


def list_platform_connections() -> list[PlatformConnectionStatus]:
    with SessionLocal() as session:
        return [_ensure_platform_records(session, platform) for platform in PLATFORM_ORDER]


def get_platform_connection(platform: PlatformName) -> PlatformConnectionStatus:
    with SessionLocal() as session:
        return _ensure_platform_records(session, platform)


def save_pending_authorization(
    platform: PlatformName,
    authorize_url: str,
    state_token: str,
) -> tuple[PlatformConnectionStatus, str]:
    with SessionLocal() as session:
        _store, authorization = _get_or_create_authorization(session, platform)
        authorization.connected = False
        authorization.status = "pending"
        authorization.last_error = None
        authorization.authorize_url = authorize_url
        authorization.pending_state = state_token
        authorization.pending_state_expires_at = datetime.now(UTC) + STATE_TTL
        connection = _build_connection_from_authorization(authorization)
        _sync_legacy_connection(session, connection, pending_state=state_token)
        session.commit()
        return connection, state_token


def mark_platform_connected(
    platform: PlatformName,
    *,
    account_label: str,
    account_id: str,
    shop_id: str | None,
    shop_name: str | None,
    access_token: str,
    refresh_token: str | None,
    token_expires_at: str | None,
    capabilities: list[str],
) -> PlatformConnectionStatus:
    connection = PlatformConnectionStatus(
        platform=platform,
        connected=True,
        status="connected",
        account_label=account_label,
        account_id=account_id,
        shop_id=shop_id,
        shop_name=shop_name,
        token_expires_at=token_expires_at,
        last_connected_at=datetime.now(UTC).isoformat(),
        capabilities=capabilities,
    )
    with SessionLocal() as session:
        store, authorization = _get_or_create_authorization(session, platform)
        health = _get_or_create_health(session, store.id, platform)
        authorization.connected = True
        authorization.status = "connected"
        authorization.account_label = account_label
        authorization.account_id = account_id
        authorization.shop_id = shop_id
        authorization.shop_name = shop_name
        authorization.token_expires_at = datetime.fromisoformat(token_expires_at) if token_expires_at else None
        authorization.last_connected_at = datetime.fromisoformat(connection.last_connected_at) if connection.last_connected_at else None
        authorization.last_error = None
        authorization.authorize_url = None
        authorization.pending_state = None
        authorization.pending_state_expires_at = None
        authorization.access_token_ciphertext = access_token
        authorization.refresh_token_ciphertext = refresh_token
        authorization.capabilities = _serialize_capabilities(capabilities)
        health.auth_status = "connected"
        health.auth_message = None
        health.incident_status = "clear"
        health.overall_status = "healthy"
        health.last_checked_at = datetime.now(UTC)
        _sync_legacy_connection(
            session,
            connection,
            pending_state=None,
            access_token=access_token,
            refresh_token=refresh_token,
        )
        _write_audit_log(
            session,
            store_id=store.id,
            entity_type="store_authorization",
            entity_id=authorization.id,
            action="connected",
            summary=f"{platform} authorization connected",
        )
        session.commit()
        return connection


def mark_platform_error(platform: PlatformName, error_message: str) -> PlatformConnectionStatus:
    with SessionLocal() as session:
        store, authorization = _get_or_create_authorization(session, platform)
        health = _get_or_create_health(session, store.id, platform)
        authorization.connected = False
        authorization.status = "error"
        authorization.account_label = None
        authorization.account_id = None
        authorization.shop_id = None
        authorization.shop_name = None
        authorization.token_expires_at = None
        authorization.last_connected_at = None
        authorization.last_error = error_message
        authorization.authorize_url = None
        authorization.pending_state = None
        authorization.pending_state_expires_at = None
        authorization.access_token_ciphertext = None
        authorization.refresh_token_ciphertext = None
        authorization.capabilities = None
        health.auth_status = "error"
        health.auth_message = error_message
        health.incident_status = "warning"
        health.overall_status = "warning"
        health.last_checked_at = datetime.now(UTC)
        connection = _build_connection_from_authorization(authorization)
        _sync_legacy_connection(session, connection)
        _write_incident(
            session,
            store_id=store.id,
            platform=platform,
            code="authorization_error",
            title=f"{platform} authorization failed",
            detail=error_message,
        )
        session.commit()
        return connection


def disconnect_platform(platform: PlatformName) -> PlatformConnectionStatus:
    with SessionLocal() as session:
        store, authorization = _get_or_create_authorization(session, platform)
        health = _get_or_create_health(session, store.id, platform)
        # Set to disconnected but mark that it was explicitly disconnected
        # so _ensure_platform_records doesn't re-initialize from defaults
        authorization.connected = False
        authorization.status = "disconnected"
        authorization.account_label = None
        authorization.account_id = None
        authorization.shop_id = None
        authorization.shop_name = None
        authorization.token_expires_at = None
        # Keep last_connected_at to indicate this was explicitly disconnected
        # not a fresh record that should be initialized from defaults
        authorization.last_connected_at = datetime.now(UTC)
        authorization.last_error = None
        authorization.authorize_url = None
        authorization.pending_state = None
        authorization.pending_state_expires_at = None
        authorization.access_token_ciphertext = None
        authorization.refresh_token_ciphertext = None
        authorization.capabilities = None
        health.auth_status = "disconnected"
        health.auth_message = None
        health.overall_status = "warning"
        health.last_checked_at = datetime.now(UTC)
        connection = PlatformConnectionStatus(
            platform=platform,
            connected=False,
            status="disconnected",
            last_connected_at=None,
            last_error=None,
            authorize_url=None,
            capabilities=[],
        )
        _sync_legacy_connection(session, connection)
        _write_audit_log(
            session,
            store_id=store.id,
            entity_type="store_authorization",
            entity_id=authorization.id,
            action="disconnected",
            summary=f"{platform} authorization disconnected",
        )
        session.commit()
        return connection


def get_pending_state(platform: PlatformName) -> str | None:
    with SessionLocal() as session:
        _store, authorization = _get_or_create_authorization(session, platform)
        if authorization.pending_state is None or authorization.pending_state_expires_at is None:
            return None
        expires_at_utc = authorization.pending_state_expires_at.replace(tzinfo=UTC) if authorization.pending_state_expires_at.tzinfo is None else authorization.pending_state_expires_at
        if expires_at_utc < datetime.now(UTC):
            authorization.pending_state = None
            authorization.pending_state_expires_at = None
            session.commit()
            return None
        return authorization.pending_state


def list_stores() -> list[StoreView]:
    with SessionLocal() as session:
        for platform in PLATFORM_ORDER:
            _ensure_platform_records(session, platform)
        records = session.scalars(select(StoreRecord).order_by(StoreRecord.platform)).all()
        return [_serialize_store(record) for record in records]


def list_store_authorizations(store_id: str) -> list[StoreAuthorizationView]:
    with SessionLocal() as session:
        records = session.scalars(
            select(StoreAuthorizationRecord)
            .where(StoreAuthorizationRecord.store_id == store_id)
            .order_by(StoreAuthorizationRecord.platform)
        ).all()
        return [_serialize_authorization(record) for record in records]


def get_store_health(store_id: str) -> StoreHealthStatusView:
    with SessionLocal() as session:
        record = session.get(StoreHealthStatusRecord, store_id)
        if record is None:
            store = session.get(StoreRecord, store_id)
            if store is None:
                raise ValueError("Store not found")
            record = _get_or_create_health(session, store.id, store.platform)
            session.commit()
        return _serialize_health(record)
