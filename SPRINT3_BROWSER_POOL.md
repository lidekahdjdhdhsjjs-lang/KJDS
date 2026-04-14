# Sprint 3: 指纹浏览器池

## 新增功能

### 1. 后端服务
- `backend/app/models_browser.py` - 浏览器配置、会话、代理数据模型
- `backend/app/services/browser_automation.py` - 指纹浏览器自动化服务
- `backend/app/repositories/browser_profiles.py` - 浏览器配置仓储层
- `backend/app/api/routes/browser_automation.py` - RESTful API 路由
- `backend/migrations/versions/0004_sprint3_browser_pool.py` - 数据库迁移

### 2. 前端界面
- `frontend/app/settings/browser-profiles/page.tsx` - 浏览器配置管理界面

### 3. 文档
- `docs/browser-automation.md` - 技术文档

## 核心特性

### 指纹伪装
- WebDriver 标识隐藏
- WebGL 指纹伪装
- Canvas 噪声注入
- Audio 指纹保护
- Navigator 属性修改

### 支持地区
- 🇸🇬 Singapore (SG)
- 🇲🇾 Malaysia (MY)
- 🇹🇭 Thailand (TH)
- 🇵🇭 Philippines (PH)
- 🇻🇳 Vietnam (VN)
- 🇮🇩 Indonesia (ID)

### API 端点
- `POST /api/v1/browser/profiles` - 创建浏览器配置
- `GET /api/v1/browser/profiles` - 列出所有配置
- `POST /api/v1/browser/sessions` - 创建浏览器会话
- `POST /api/v1/browser/sessions/{id}/scrape` - 抓取URL
- `POST /api/v1/browser/sessions/{id}/scrape/shopee` - 抓取Shopee商品
- `POST /api/v1/browser/sessions/{id}/scrape/1688` - 抓取1688商品
- `POST /api/v1/browser/proxies` - 添加代理

## 使用方法

### 1. 安装依赖
```bash
cd backend
pip install playwright aiofiles
python -m playwright install chromium
```

### 2. 运行迁移
```bash
alembic upgrade head
```

### 3. 访问界面
打开 `/settings/browser-profiles` 页面

## 技术架构
- Playwright 作为浏览器自动化引擎
- 持久化浏览器上下文
- 异步会话管理
- 代理健康监控
