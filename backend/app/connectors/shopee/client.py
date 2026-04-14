"""Shopee API client for real API calls."""
import httpx
from app.core.config import settings
from app.schemas.platform_connections import PlatformCapability


class ShopeeApiError(Exception):
    """Shopee API error."""
    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"Shopee API error {code}: {message}")


class ShopeeClient:
    """Async Shopee API client."""

    def __init__(self, access_token: str, shop_id: str):
        self.access_token = access_token
        self.shop_id = shop_id
        self.base_url = settings.shopee_api_base or "https://partner.shopeemobile.com/api/v1"
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.access_token}",
                },
                timeout=30.0,
            )
        return self._client

    async def close(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "ShopeeClient":
        return self

    async def __aexit__(self, *args) -> None:
        await self.close()

    async def get_shop_info(self) -> dict:
        """Get shop information."""
        client = await self._get_client()
        response = await client.post(
            "/shop/get_shop_info",
            params={"partner_id": settings.shopee_client_id},
            json={"shop_id": int(self.shop_id)},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            raise ShopeeApiError(data["error"], data.get("message", ""))
        return data.get("response", {})

    async def get_product_list(self, page_size: int = 50, offset: int = 0) -> dict:
        """Get product list."""
        client = await self._get_client()
        response = await client.post(
            "/product/get_item_list",
            params={"partner_id": settings.shopee_client_id},
            json={
                "shop_id": int(self.shop_id),
                "page_size": page_size,
                "offset": offset,
            },
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            raise ShopeeApiError(data["error"], data.get("message", ""))
        return data.get("response", {})

    async def create_product(self, item_data: dict) -> dict:
        """Create a new product listing."""
        client = await self._get_client()
        response = await client.post(
            "/product/add_item",
            params={"partner_id": settings.shopee_client_id},
            json={**item_data, "shop_id": int(self.shop_id)},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            raise ShopeeApiError(data["error"], data.get("message", ""))
        return data.get("response", {})

    async def get_categories(self) -> list[dict]:
        """Get category list for the shop's region."""
        client = await self._get_client()
        response = await client.post(
            "/product/get_category",
            params={"partner_id": settings.shopee_client_id},
            json={"shop_id": int(self.shop_id)},
        )
        response.raise_for_status()
        data = response.json()
        if data.get("error"):
            raise ShopeeApiError(data["error"], data.get("message", ""))
        return data.get("response", {}).get("category_list", [])


def create_shopee_client(access_token: str, shop_id: str) -> ShopeeClient:
    return ShopeeClient(access_token=access_token, shop_id=shop_id)
