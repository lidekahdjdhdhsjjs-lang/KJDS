"""指纹浏览器服务 - 自建浏览器池核心服务"""
import asyncio
import hashlib
import json
import os
import random
import secrets
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import aiofiles
import httpx
from playwright.async_api import async_playwright, Browser, BrowserContext, Page, Playwright

from app.core.config import settings
from app.models_browser import BrowserProfileRecord, BrowserSessionRecord
from app.repositories.browser_profiles import BrowserProfileRepository, BrowserSessionRepository


# ============================================================================
# 指纹配置
# ============================================================================

# Shopee 各地区的默认配置
REGION_CONFIGS = {
    "SG": {
        "timezone": "Asia/Singapore",
        "language": "en-SG",
        "locale": "en_SG",
        "country": "Singapore",
        "currency": "SGD",
    },
    "MY": {
        "timezone": "Asia/Kuala_Lumpur",
        "language": "en-MY",
        "locale": "en_MY",
        "country": "Malaysia",
        "currency": "MYR",
    },
    "TH": {
        "timezone": "Asia/Bangkok",
        "language": "th-TH",
        "locale": "th_TH",
        "country": "Thailand",
        "currency": "THB",
    },
    "PH": {
        "timezone": "Asia/Manila",
        "language": "en-PH",
        "locale": "en_PH",
        "country": "Philippines",
        "currency": "PHP",
    },
    "VN": {
        "timezone": "Asia/Ho_Chi_Minh",
        "language": "vi-VN",
        "locale": "vi_VN",
        "country": "Vietnam",
        "currency": "VND",
    },
    "ID": {
        "timezone": "Asia/Jakarta",
        "language": "id-ID",
        "locale": "id_ID",
        "country": "Indonesia",
        "currency": "IDR",
    },
}

# 常见 User-Agent 池
USER_AGENTS = [
    # Windows Chrome
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    # Mac Chrome
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
]

# WebGL 指纹池
WEBGL_CONFIGS = [
    {"vendor": "Google Inc. (NVIDIA)", "renderer": "ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)"},
    {"vendor": "Google Inc. (NVIDIA)", "renderer": "ANGLE (NVIDIA, NVIDIA GeForce GTX 1650 Direct3D11 vs_5_0 ps_5_0)"},
    {"vendor": "Google Inc. (AMD)", "renderer": "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0)"},
    {"vendor": "Google Inc. (Intel)", "renderer": "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0)"},
    {"vendor": "Apple Inc.", "renderer": "Apple M1"},
]


# ============================================================================
# 反检测脚本
# ============================================================================

STEALTH_SCRIPT = """
// 隐藏 webdriver 标识
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});

// 修改 plugins
Object.defineProperty(navigator, 'plugins', {
    get: () => {
        const plugins = [
            { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', filename: 'internal-nacl-plugin' }
        ];
        plugins.item = (i) => plugins[i] || null;
        plugins.namedItem = (name) => plugins.find(p => p.name === name) || null;
        plugins.refresh = () => {};
        return plugins;
    }
});

// 修改 languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['zh-CN', 'zh', 'en', 'en-US']
});

// 修改 platform
Object.defineProperty(navigator, 'platform', {
    get: () => 'Win32'
});

// 修改 hardwareConcurrency
Object.defineProperty(navigator, 'hardwareConcurrency', {
    get: () => 8
});

// 修改 deviceMemory
Object.defineProperty(navigator, 'deviceMemory', {
    get: () => 8
});

// 修改 permissions
const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
);

// 修改 WebGL fingerprint
const getParameter = WebGLRenderingContext.prototype.getParameter;
WebGLRenderingContext.prototype.getParameter = function(parameter) {
    // UNMASKED_VENDOR_WEBGL
    if (parameter === 37445) {
        return 'Google Inc. (NVIDIA)';
    }
    // UNMASKED_RENDERER_WEBGL
    if (parameter === 37446) {
        return 'ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 Direct3D11 vs_5_0 ps_5_0)';
    }
    return getParameter.call(this, parameter);
};

// Canvas fingerprint protection
const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
HTMLCanvasElement.prototype.toDataURL = function(type) {
    if (this.width === 220 && this.height === 30) {
        // 添加微小噪声
        const noise = String.fromCharCode(Math.floor(Math.random() * 10) + 48);
        const result = originalToDataURL.call(this, type);
        return result.slice(0, 50) + noise + result.slice(51);
    }
    return originalToDataURL.call(this, type);
};

// Audio fingerprint protection
const originalAudioContext = window.AudioContext || window.webkitAudioContext;
if (originalAudioContext) {
    const modifiedAudioContext = function() {
        const context = new originalAudioContext();
        const originalCreateOscillator = context.createOscillator;
        context.createOscillator = function() {
            const oscillator = originalCreateOscillator.call(this);
            // 添加微小频率偏移
            const originalFrequency = oscillator.frequency;
            oscillator.frequency = new Proxy(originalFrequency, {
                get: function(target, prop) {
                    if (prop === 'value') {
                        return target.value + (Math.random() - 0.5) * 0.0001;
                    }
                    return target[prop];
                }
            });
            return oscillator;
        };
        return context;
    };
    window.AudioContext = modifiedAudioContext;
    window.webkitAudioContext = modifiedAudioContext;
}

// 隐藏自动化特征
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
"""


# ============================================================================
# 浏览器会话
# ============================================================================

class BrowserSession:
    """活跃的浏览器会话"""

    def __init__(
        self,
        session_id: str,
        profile: BrowserProfileRecord,
        browser: Browser,
        context: BrowserContext,
        playwright: Playwright,
    ):
        self.session_id = session_id
        self.profile = profile
        self.browser = browser
        self.context = context
        self.playwright = playwright
        self.pages_visited = 0
        self.bytes_transferred = 0
        self.error_count = 0
        self.started_at = datetime.now(UTC)
        self._closed = False

    async def new_page(self) -> Page:
        """创建新页面"""
        if self._closed:
            raise RuntimeError("Session is closed")

        page = await self.context.new_page()

        # 注入反检测脚本
        await page.add_init_script(STEALTH_SCRIPT)

        # 监听请求以统计流量
        async def on_request(request):
            self.bytes_transferred += len(request.post_data or "")

        async def on_response(response):
            try:
                body = await response.body()
                self.bytes_transferred += len(body)
            except Exception:
                pass

        page.on("request", on_request)
        page.on("response", on_response)

        self.pages_visited += 1
        return page

    async def close(self):
        """关闭会话"""
        if self._closed:
            return

        self._closed = True
        try:
            await self.context.close()
            await self.browser.close()
            await self.playwright.stop()
        except Exception:
            pass


# ============================================================================
# 浏览器自动化服务
# ============================================================================

class BrowserAutomationService:
    """指纹浏览器自动化服务"""

    def __init__(self):
        self._sessions: dict[str, BrowserSession] = {}
        self._profile_dir = Path(settings.PROFILE_DIR if hasattr(settings, 'PROFILE_DIR') else "/tmp/browser_profiles")
        self._profile_dir.mkdir(parents=True, exist_ok=True)

    async def create_profile(
        self,
        name: str,
        region: str,
        store_id: str | None = None,
        proxy_config: dict | None = None,
        **kwargs,
    ) -> BrowserProfileRecord:
        """创建新的浏览器配置文件"""
        if region not in REGION_CONFIGS:
            raise ValueError(f"Unsupported region: {region}")

        region_config = REGION_CONFIGS[region]

        # 随机选择指纹配置
        user_agent = random.choice(USER_AGENTS)
        webgl_config = random.choice(WEBGL_CONFIGS)

        # 生成随机噪声种子
        canvas_noise_seed = secrets.randbelow(1000000)
        audio_noise_seed = secrets.randbelow(1000000)

        profile_id = str(uuid.uuid4())

        profile = BrowserProfileRecord(
            id=profile_id,
            store_id=store_id,
            name=name,
            region=region,
            platform="chromium",
            user_agent=kwargs.get("user_agent", user_agent),
            viewport_width=kwargs.get("viewport_width", 1920),
            viewport_height=kwargs.get("viewport_height", 1080),
            timezone=region_config["timezone"],
            language=region_config["language"],
            locale=region_config["locale"],
            platform_os=kwargs.get("platform_os", "Win32"),
            cpu_cores=kwargs.get("cpu_cores", 8),
            memory_gb=kwargs.get("memory_gb", 8),
            webgl_vendor=webgl_config["vendor"],
            webgl_renderer=webgl_config["renderer"],
            canvas_noise_seed=canvas_noise_seed,
            audio_noise_seed=audio_noise_seed,
            proxy_host=proxy_config.get("host") if proxy_config else None,
            proxy_port=proxy_config.get("port") if proxy_config else None,
            proxy_username=proxy_config.get("username") if proxy_config else None,
            proxy_password=proxy_config.get("password") if proxy_config else None,
            proxy_type=proxy_config.get("type", "http") if proxy_config else "http",
            is_active=True,
            is_locked=False,
            tags=json.dumps(kwargs.get("tags", [])),
        )

        return profile

    async def create_session(
        self,
        profile: BrowserProfileRecord,
        task_type: str = "scrape",
        task_id: str | None = None,
        headless: bool = True,
    ) -> BrowserSession:
        """创建浏览器会话"""
        if profile.is_locked:
            raise RuntimeError(f"Profile {profile.id} is locked")

        if not profile.is_active:
            raise RuntimeError(f"Profile {profile.id} is not active")

        # 创建配置文件目录
        profile_path = self._profile_dir / profile.id
        profile_path.mkdir(parents=True, exist_ok=True)

        # 启动 Playwright
        playwright = await async_playwright().start()

        # 配置浏览器启动参数
        launch_args = [
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--disable-extensions",
            "--disable-gpu",
            "--no-sandbox",
            "--disable-dev-shm-usage",
            f"--webgl-vendor={profile.webgl_vendor}",
            f"--webgl-renderer={profile.webgl_renderer}",
        ]

        # 配置代理
        proxy = None
        if profile.proxy_host:
            proxy = {
                "server": f"{profile.proxy_type}://{profile.proxy_host}:{profile.proxy_port}",
            }
            if profile.proxy_username:
                proxy["username"] = profile.proxy_username
                proxy["password"] = profile.proxy_password

        # 启动浏览器
        browser = await playwright.chromium.launch(
            headless=headless,
            args=launch_args,
        )

        # 创建持久化上下文
        context = await browser.new_context(
            user_agent=profile.user_agent,
            viewport={
                "width": profile.viewport_width,
                "height": profile.viewport_height,
            },
            locale=profile.locale,
            timezone_id=profile.timezone,
            geolocation={"latitude": 1.3521, "longitude": 103.8198} if profile.region == "SG" else None,
            permissions=["geolocation"] if profile.region == "SG" else [],
            proxy=proxy,
            ignore_https_errors=True,
            color_scheme="light",
            device_scale_factor=1,
            has_touch=False,
            is_mobile=False,
            java_script_enabled=True,
        )

        # 创建会话
        session_id = str(uuid.uuid4())
        session = BrowserSession(
            session_id=session_id,
            profile=profile,
            browser=browser,
            context=context,
            playwright=playwright,
        )

        self._sessions[session_id] = session
        return session

    async def close_session(self, session_id: str) -> dict:
        """关闭浏览器会话"""
        session = self._sessions.pop(session_id, None)
        if not session:
            return {"error": "Session not found"}

        await session.close()

        ended_at = datetime.now(UTC)
        duration = int((ended_at - session.started_at).total_seconds())

        return {
            "session_id": session_id,
            "pages_visited": session.pages_visited,
            "bytes_transferred": session.bytes_transferred,
            "error_count": session.error_count,
            "started_at": session.started_at.isoformat(),
            "ended_at": ended_at.isoformat(),
            "duration_seconds": duration,
        }

    async def scrape_url(
        self,
        session: BrowserSession,
        url: str,
        wait_for: str | None = None,
        timeout: int = 30000,
    ) -> dict:
        """使用会话抓取URL"""
        page = await session.new_page()

        try:
            # 设置超时
            page.set_default_timeout(timeout)

            # 访问页面
            response = await page.goto(url, wait_until="networkidle")

            if not response:
                raise RuntimeError(f"Failed to load {url}")

            if response.status >= 400:
                raise RuntimeError(f"HTTP error {response.status} for {url}")

            # 等待特定元素
            if wait_for:
                await page.wait_for_selector(wait_for, timeout=timeout)

            # 获取页面内容
            content = await page.content()
            title = await page.title()

            return {
                "success": True,
                "url": url,
                "status": response.status,
                "title": title,
                "content_length": len(content),
                "content": content if len(content) < 100000 else content[:100000],
            }

        except Exception as e:
            session.error_count += 1
            return {
                "success": False,
                "url": url,
                "error": str(e),
            }

        finally:
            await page.close()

    async def scrape_shopee_product(
        self,
        session: BrowserSession,
        product_url: str,
    ) -> dict:
        """抓取Shopee商品详情"""
        page = await session.new_page()

        try:
            await page.goto(product_url, wait_until="networkidle", timeout=60000)

            # 等待商品信息加载
            await page.wait_for_selector("div[class*='product-detail']", timeout=30000)

            # 提取商品信息
            product_data = await page.evaluate("""
                () => {
                    const data = {
                        title: '',
                        price: '',
                        original_price: '',
                        rating: '',
                        sold: '',
                        stock: '',
                        shop_name: '',
                        shop_rating: '',
                        description: '',
                        images: [],
                        variants: [],
                    };

                    // 标题
                    const titleEl = document.querySelector('div[class*="product-name"] span');
                    if (titleEl) data.title = titleEl.textContent.trim();

                    // 价格
                    const priceEl = document.querySelector('div[class*="price"] span');
                    if (priceEl) data.price = priceEl.textContent.trim();

                    // 原价
                    const originalPriceEl = document.querySelector('div[class*="original-price"]');
                    if (originalPriceEl) data.original_price = originalPriceEl.textContent.trim();

                    // 评分
                    const ratingEl = document.querySelector('div[class*="rating"]');
                    if (ratingEl) data.rating = ratingEl.textContent.trim();

                    // 已售
                    const soldEl = document.querySelector('div[class*="sold"]');
                    if (soldEl) data.sold = soldEl.textContent.trim();

                    // 店铺名
                    const shopEl = document.querySelector('a[class*="shop-name"]');
                    if (shopEl) data.shop_name = shopEl.textContent.trim();

                    // 图片
                    const imgEls = document.querySelectorAll('div[class*="product-image"] img');
                    data.images = Array.from(imgEls).map(img => img.src).filter(Boolean);

                    return data;
                }
            """)

            return {
                "success": True,
                "url": product_url,
                "data": product_data,
            }

        except Exception as e:
            session.error_count += 1
            return {
                "success": False,
                "url": product_url,
                "error": str(e),
            }

        finally:
            await page.close()

    async def scrape_1688_product(
        self,
        session: BrowserSession,
        product_url: str,
    ) -> dict:
        """抓取1688商品详情"""
        page = await session.new_page()

        try:
            await page.goto(product_url, wait_until="networkidle", timeout=60000)

            # 等待页面加载
            await page.wait_for_selector(".d-content", timeout=30000)

            # 提取商品信息
            product_data = await page.evaluate("""
                () => {
                    const data = {
                        title: '',
                        price: '',
                        moq: '',
                        supplier: '',
                        supplier_location: '',
                        images: [],
                        attributes: {},
                    };

                    // 标题
                    const titleEl = document.querySelector('.d-title');
                    if (titleEl) data.title = titleEl.textContent.trim();

                    // 价格
                    const priceEl = document.querySelector('.price-value');
                    if (priceEl) data.price = priceEl.textContent.trim();

                    // MOQ
                    const moqEl = document.querySelector('.moq-value');
                    if (moqEl) data.moq = moqEl.textContent.trim();

                    // 店铺名
                    const shopEl = document.querySelector('.shop-name');
                    if (shopEl) data.supplier = shopEl.textContent.trim();

                    // 地区
                    const locationEl = document.querySelector('.shop-location');
                    if (locationEl) data.supplier_location = locationEl.textContent.trim();

                    // 图片
                    const imgEls = document.querySelectorAll('.tab-content img');
                    data.images = Array.from(imgEls).map(img => img.src).filter(Boolean);

                    return data;
                }
            """)

            return {
                "success": True,
                "url": product_url,
                "data": product_data,
            }

        except Exception as e:
            session.error_count += 1
            return {
                "success": False,
                "url": product_url,
                "error": str(e),
            }

        finally:
            await page.close()

    def get_active_sessions(self) -> list[str]:
        """获取所有活跃会话"""
        return list(self._sessions.keys())

    async def close_all_sessions(self):
        """关闭所有会话"""
        session_ids = list(self._sessions.keys())
        for session_id in session_ids:
            await self.close_session(session_id)


# ============================================================================
# 全局服务实例
# ============================================================================

browser_automation_service = BrowserAutomationService()
