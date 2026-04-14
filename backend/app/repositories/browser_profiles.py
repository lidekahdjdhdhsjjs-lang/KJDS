"""浏览器配置文件仓储层"""
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.models_browser import BrowserProfileRecord, BrowserSessionRecord, ProxyPoolRecord


class BrowserProfileRepository:
    """浏览器配置文件仓储"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, profile: BrowserProfileRecord) -> BrowserProfileRecord:
        """创建配置文件"""
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_by_id(self, profile_id: str) -> BrowserProfileRecord | None:
        """根据ID获取配置文件"""
        result = self.db.execute(
            select(BrowserProfileRecord).where(BrowserProfileRecord.id == profile_id)
        )
        return result.scalar_one_or_none()

    def get_by_store(self, store_id: str) -> list[BrowserProfileRecord]:
        """获取店铺的所有配置文件"""
        result = self.db.execute(
            select(BrowserProfileRecord)
            .where(BrowserProfileRecord.store_id == store_id)
            .order_by(BrowserProfileRecord.created_at.desc())
        )
        return list(result.scalars().all())

    def get_by_region(self, region: str) -> list[BrowserProfileRecord]:
        """获取特定区域的所有配置文件"""
        result = self.db.execute(
            select(BrowserProfileRecord)
            .where(BrowserProfileRecord.region == region)
            .where(BrowserProfileRecord.is_active == True)
            .where(BrowserProfileRecord.is_locked == False)
            .order_by(BrowserProfileRecord.last_used_at.asc().nulls_first())
        )
        return list(result.scalars().all())

    def get_available(self, region: str | None = None) -> BrowserProfileRecord | None:
        """获取一个可用的配置文件"""
        query = select(BrowserProfileRecord).where(
            BrowserProfileRecord.is_active == True,
            BrowserProfileRecord.is_locked == False,
        )

        if region:
            query = query.where(BrowserProfileRecord.region == region)

        query = query.order_by(BrowserProfileRecord.last_used_at.asc().nulls_first()).limit(1)

        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def list_all(
        self,
        is_active: bool | None = None,
        region: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[BrowserProfileRecord]:
        """列出所有配置文件"""
        query = select(BrowserProfileRecord)

        if is_active is not None:
            query = query.where(BrowserProfileRecord.is_active == is_active)

        if region:
            query = query.where(BrowserProfileRecord.region == region)

        query = query.order_by(BrowserProfileRecord.created_at.desc()).offset(offset).limit(limit)

        result = self.db.execute(query)
        return list(result.scalars().all())

    def update(
        self,
        profile_id: str,
        **kwargs,
    ) -> BrowserProfileRecord | None:
        """更新配置文件"""
        profile = self.get_by_id(profile_id)
        if not profile:
            return None

        for key, value in kwargs.items():
            if hasattr(profile, key):
                setattr(profile, key, value)

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def lock(self, profile_id: str) -> bool:
        """锁定配置文件"""
        result = self.db.execute(
            update(BrowserProfileRecord)
            .where(BrowserProfileRecord.id == profile_id)
            .values(is_locked=True)
        )
        self.db.commit()
        return result.rowcount > 0

    def unlock(self, profile_id: str) -> bool:
        """解锁配置文件"""
        result = self.db.execute(
            update(BrowserProfileRecord)
            .where(BrowserProfileRecord.id == profile_id)
            .values(is_locked=False)
        )
        self.db.commit()
        return result.rowcount > 0

    def mark_used(self, profile_id: str) -> bool:
        """标记为已使用"""
        result = self.db.execute(
            update(BrowserProfileRecord)
            .where(BrowserProfileRecord.id == profile_id)
            .values(
                last_used_at=datetime.now(UTC),
                total_uses=BrowserProfileRecord.total_uses + 1,
            )
        )
        self.db.commit()
        return result.rowcount > 0

    def delete(self, profile_id: str) -> bool:
        """删除配置文件"""
        profile = self.get_by_id(profile_id)
        if not profile:
            return False

        self.db.delete(profile)
        self.db.commit()
        return True


class BrowserSessionRepository:
    """浏览器会话仓储"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, session: BrowserSessionRecord) -> BrowserSessionRecord:
        """创建会话记录"""
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_by_id(self, session_id: str) -> BrowserSessionRecord | None:
        """根据ID获取会话"""
        result = self.db.execute(
            select(BrowserSessionRecord).where(BrowserSessionRecord.id == session_id)
        )
        return result.scalar_one_or_none()

    def get_by_profile(self, profile_id: str, limit: int = 10) -> list[BrowserSessionRecord]:
        """获取配置文件的历史会话"""
        result = self.db.execute(
            select(BrowserSessionRecord)
            .where(BrowserSessionRecord.profile_id == profile_id)
            .order_by(BrowserSessionRecord.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    def get_active_by_profile(self, profile_id: str) -> list[BrowserSessionRecord]:
        """获取配置文件的活跃会话"""
        result = self.db.execute(
            select(BrowserSessionRecord)
            .where(BrowserSessionRecord.profile_id == profile_id)
            .where(BrowserSessionRecord.status.in_(["created", "running", "idle"]))
            .order_by(BrowserSessionRecord.created_at.desc())
        )
        return list(result.scalars().all())

    def update(
        self,
        session_id: str,
        **kwargs,
    ) -> BrowserSessionRecord | None:
        """更新会话"""
        session = self.get_by_id(session_id)
        if not session:
            return None

        for key, value in kwargs.items():
            if hasattr(session, key):
                setattr(session, key, value)

        self.db.commit()
        self.db.refresh(session)
        return session

    def end_session(
        self,
        session_id: str,
        status: str = "closed",
        error: str | None = None,
    ) -> bool:
        """结束会话"""
        now = datetime.now(UTC)
        session = self.get_by_id(session_id)
        if not session:
            return False

        duration = int((now - session.started_at).total_seconds())

        self.db.execute(
            update(BrowserSessionRecord)
            .where(BrowserSessionRecord.id == session_id)
            .values(
                status=status,
                ended_at=now,
                duration_seconds=duration,
                last_error=error,
            )
        )
        self.db.commit()
        return True


class ProxyPoolRepository:
    """代理池仓储"""

    def __init__(self, db: Session):
        self.db = db

    def create(self, proxy: ProxyPoolRecord) -> ProxyPoolRecord:
        """创建代理"""
        self.db.add(proxy)
        self.db.commit()
        self.db.refresh(proxy)
        return proxy

    def get_by_id(self, proxy_id: str) -> ProxyPoolRecord | None:
        """根据ID获取代理"""
        result = self.db.execute(
            select(ProxyPoolRecord).where(ProxyPoolRecord.id == proxy_id)
        )
        return result.scalar_one_or_none()

    def get_available(self, region: str | None = None) -> ProxyPoolRecord | None:
        """获取一个可用代理"""
        query = select(ProxyPoolRecord).where(
            ProxyPoolRecord.is_active == True,
            ProxyPoolRecord.health_score > 0.5,
        )

        if region:
            query = query.where(ProxyPoolRecord.country == region)

        query = query.order_by(
            ProxyPoolRecord.health_score.desc(),
            ProxyPoolRecord.success_count.desc(),
        ).limit(1)

        result = self.db.execute(query)
        return result.scalar_one_or_none()

    def list_all(
        self,
        is_active: bool | None = None,
        country: str | None = None,
    ) -> list[ProxyPoolRecord]:
        """列出所有代理"""
        query = select(ProxyPoolRecord)

        if is_active is not None:
            query = query.where(ProxyPoolRecord.is_active == is_active)

        if country:
            query = query.where(ProxyPoolRecord.country == country)

        query = query.order_by(ProxyPoolRecord.health_score.desc())

        result = self.db.execute(query)
        return list(result.scalars().all())

    def update_health(
        self,
        proxy_id: str,
        success: bool,
        response_time_ms: int | None = None,
    ) -> bool:
        """更新代理健康状态"""
        proxy = self.get_by_id(proxy_id)
        if not proxy:
            return False

        # 更新成功/失败计数
        if success:
            new_success = proxy.success_count + 1
            new_failure = proxy.failure_count
        else:
            new_success = proxy.success_count
            new_failure = proxy.failure_count + 1

        # 计算新的健康分数
        total = new_success + new_failure
        if total > 0:
            health_score = new_success / total
        else:
            health_score = 1.0

        # 更新平均响应时间
        avg_time = proxy.avg_response_time_ms
        if response_time_ms is not None:
            if avg_time == 0:
                avg_time = response_time_ms
            else:
                avg_time = (avg_time * proxy.success_count + response_time_ms) // (proxy.success_count + 1)

        self.db.execute(
            update(ProxyPoolRecord)
            .where(ProxyPoolRecord.id == proxy_id)
            .values(
                success_count=new_success,
                failure_count=new_failure,
                health_score=health_score,
                avg_response_time_ms=avg_time,
                last_checked_at=datetime.now(UTC),
            )
        )
        self.db.commit()
        return True

    def delete(self, proxy_id: str) -> bool:
        """删除代理"""
        proxy = self.get_by_id(proxy_id)
        if not proxy:
            return False

        self.db.delete(proxy)
        self.db.commit()
        return True
