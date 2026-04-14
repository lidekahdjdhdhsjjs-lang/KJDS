"""1688 API client for real API calls."""
import httpx
from app.core.config import settings


class AlibabaApiError(Exception):
    """Alibaba 1688 API error."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"1688 API error {code}: {message}")


class AlibabaClient:
    """Async Alibaba 1688 API client."""

    def __init__(self, access_token: str):
        self.access_token = access_token
        self.base_url = settings.alibaba_api_base or "https://gw.open.1688.com/openapi"
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "AlibabaClient":
        return self

    async def __aexit__(self, *args) -> None:
        await self.close()

    async def get_product_list(self, page_size: int = 20, page: int = 1) -> dict:
        """Search products from 1688."""
        client = await self._get_client()
        response = await client.post(
            "/param2/1/com.alibaba.open/alibaba.product.list.get/",
            data={
                "access_token": self.access_token,
                "pageSize": page_size,
                "page": page,
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get("errorCode") or data.get("error"):
            raise AlibabaApiError(
                data.get("errorCode", "unknown"),
                data.get("errorMessage", str(data)),
            )
        return data

    async def get_product_detail(self, product_id: str) -> dict:
        """Get product detail."""
        client = await self._get_client()
        response = await client.post(
            "/param2/1/com.alibaba.open/alibaba.product.get/",
            data={
                "access_token": self.access_token,
                "productID": product_id,
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get("errorCode") or data.get("error"):
            raise AlibabaApiError(
                data.get("errorCode", "unknown"),
                data.get("errorMessage", str(data)),
            )
        return data


def create_alibaba_client(access_token: str) -> AlibabaClient:
    return AlibabaClient(access_token=access_token)