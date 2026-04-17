# 跨境电商 AI 运营系统

基于 AI 的跨境电商选品、上架、运营一体化平台。支持 Shopee 单店铺运营，人工最终审核发布。

## 功能特性

### Sprint 1 ✅ (已完成)
- **Store 授权管理**: Shopee OAuth 2.0 真授权、续期预警、失效阻断
- **健康状态监控**: 实时追踪授权状态、API 配额、风控状态
- **审计日志记录**: 所有决策可追溯、可解释
- **事件追踪**: Incident 异常事件管理
- **安全 State Token**: HMAC 签名防 CSRF

### Sprint 2 ✅ (已完成)
- **批次管理 (OpportunityBatch)**: 批次创建、启动、暂停、恢复、归档
- **机会商品体 (OpportunityItem)**: 完整状态机管理
- **供给侧证据 (SupplyCandidate)**: 1688 商品评分与候选
- **需求侧证据 (DemandSignalSnapshot)**: Shopee 热词、榜单、竞品
- **类目映射 (CategoryMapping)**: AI 类目属性映射
- **内容改造 (ContentVariant)**: 标题、卖点、图片版本管理
- **定价决策 (PricingDecision)**: AI 提议 + 规则裁决
- **预飞检查 (PreflightCheck)**: 利润、合规、库存、账号健康门控
- **发布管理 (PublishTask/PublishResult)**: 幂等发布、结果回流
- **采购草稿 (ProcurementDraft)**: 半自动采购单确认
- **异常中心 (Exceptions Center)**: Incidents + Blocked Tasks + Store Health
- **Agent 追踪 (AgentRun)**: AI 执行记录与成本追踪
- **训练归档 (TrainingArchivePackage)**: ML 训练数据包管理

## 生产部署

### 系统要求

- Python 3.12+
- Node.js 18+
- PostgreSQL 15+ (生产环境)
- Redis 7+ (可选，用于任务队列)

### 环境变量配置

#### 后端 (`backend/.env`)

```bash
# 应用配置
APP_NAME=Shopee AI Ops
APP_ENV=production
APP_DEBUG=false

# 数据库
POSTGRES_DSN=postgresql://user:password@localhost:5432/shopee_ai_ops

# 安全配置
CORS_ORIGINS=https://your-domain.com
SESSION_SECRET_KEY=your-secure-random-key-here
PLATFORM_AUTH_STATE_SECRET=your-hmac-secret-key

# Shopee OAuth
SHOPEE_CLIENT_ID=your_client_id
SHOPEE_CLIENT_SECRET=your_client_secret
SHOPEE_REDIRECT_URI=https://your-domain.com/api/v1/platform-connections/shopee/callback

# 1688 配置
ALIBABA_CLIENT_ID=your_client_id
ALIBABA_CLIENT_SECRET=your_client_secret
```

#### 前端 (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_BASE=https://your-domain.com/api/v1
```

### 部署步骤

#### 1. 后端部署

```bash
cd backend

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -e .

# 运行数据库迁移
alembic upgrade head

# 启动生产服务器
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### 2. 前端部署

```bash
cd frontend

# 安装依赖
npm install

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

### Docker 部署

```bash
# 构建并启动所有服务
docker-compose -f docker-compose.prod.yml up -d

# 查看日志
docker-compose logs -f
```

### 健康检查

| 端点 | 用途 |
|------|------|
| `/health` | 基础健康检查 |
| `/health/detailed` | 数据库连接状态、迁移状态 |
| `/health/ready` | Kubernetes 就绪探针 |

## 快速开始 (开发环境)

### 前置要求

- Python 3.12+
- Node.js 18+
- SQLite (开发) / PostgreSQL (生产)

### 后端启动

```bash
cd backend

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# 或 .venv\Scripts\activate  # Windows

# 安装依赖
pip install -e .

# 运行数据库迁移
alembic upgrade head

# 启动开发服务器
uvicorn app.main:app --reload --port 8000
```

### 前端启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 首页 | http://localhost:3000 |
| Dashboard | http://localhost:3000/dashboard |
| 批次管理 | http://localhost:3000/batches |
| 异常中心 | http://localhost:3000/exceptions |
| Agent 追踪 | http://localhost:3000/agent-runs |
| 采购管理 | http://localhost:3000/procurement |
| 训练归档 | http://localhost:3000/training-archive |
| 平台设置 | http://localhost:3000/settings/platform-connections |
| API 文档 | http://localhost:8000/docs |
| 健康检查 | http://localhost:8000/health |

## 项目结构

```
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── api/routes/         # API 路由
│   │   │   ├── batches.py      # 批次管理
│   │   │   ├── opportunities.py # 机会商品
│   │   │   ├── incidents.py    # 异常管理
│   │   │   ├── store_health.py # 店铺健康
│   │   │   ├── agent_runs.py   # Agent 追踪
│   │   │   └── ...
│   │   ├── models.py           # SQLAlchemy 模型
│   │   ├── repositories/       # 数据访问层
│   │   ├── services/           # 业务逻辑层
│   │   ├── schemas/            # Pydantic 模式
│   │   └── core/               # 配置与认证
│   ├── migrations/             # Alembic 迁移
│   └── tests/                  # pytest 测试
├── frontend/                   # Next.js 前端
│   ├── app/                    # App Router 页面
│   ├── components/             # React 组件
│   ├── lib/                    # 工具库
│   └── e2e/                    # Playwright E2E 测试
├── spec.md                     # 产品规格说明
└── README.md
```

## API 端点

### 核心资源

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/v1/batches` | GET, POST | 批次列表、创建 |
| `/api/v1/batches/{id}` | GET | 批次详情 |
| `/api/v1/batches/{id}/start` | POST | 启动批次 |
| `/api/v1/batches/{id}/pause` | POST | 暂停批次 |
| `/api/v1/batches/{id}/statistics` | GET | 批次统计 |
| `/api/v1/opportunities` | GET, POST | 机会商品列表、创建 |
| `/api/v1/opportunities/{id}/detail` | GET | 商品完整详情 |
| `/api/v1/opportunities/{id}/advance/{status}` | POST | 推进状态 |
| `/api/v1/opportunities/bulk/status` | POST | 批量更新状态 |
| `/api/v1/incidents` | GET | 异常列表 |
| `/api/v1/incidents/{id}/acknowledge` | POST | 确认异常 |
| `/api/v1/incidents/{id}/resolve` | POST | 解决异常 |
| `/api/v1/agent-runs` | GET, POST | Agent 运行列表、创建 |
| `/api/v1/store-health` | GET | 店铺健康状态 |
| `/api/v1/procurement-drafts` | GET | 采购草稿列表 |
| `/api/v1/training-packages` | GET | 训练包列表 |
| `/health` | GET | 基础健康检查 |
| `/health/detailed` | GET | 详细健康状态 |
| `/health/ready` | GET | 就绪检查 |

## 数据模型

### 核心实体

```
OpportunityBatch (候选批次)
├── OpportunityItem (机会商品体) × N
│   ├── DemandSignalSnapshot (需求证据) × N
│   ├── SupplyCandidate (供给证据) × N
│   ├── CategoryMapping (类目映射)
│   ├── ContentVariant (内容版本) × N
│   ├── PricingDecision (定价决策) × N
│   ├── PreflightCheck (预飞检查) × N
│   ├── PublishTask (发布任务)
│   │   └── PublishResult (发布结果)
│   └── ProcurementDraft (采购草稿)
├── Incident (异常事件) × N
└── AgentRun (Agent 运行) × N
```

### 状态机

#### Batch 状态

```
draft → queued → running → paused → running → completed/completed_with_issues/failed/archived
↓
blocked
```

#### Item 状态

```
discovered → shortlisted → sourcing_scored → mapping_in_progress → mapping_confirmed
→ content_generating → pricing_ready → review_passed → preflight_passed
→ publish_queued → publishing → published/blocked/rejected/manual_required
```

## 测试

### 后端测试

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v              # 详细输出
pytest tests/ -q --tb=short   # 简洁输出
pytest tests/ --cov=app       # 覆盖率报告
```

当前状态: **116 tests passing** (pytest, SQLite dev.db)

### 前端测试

```bash
cd frontend
bun run test          # 单元测试 (Vitest)
npm run build         # 构建检查
npm run test:e2e      # E2E 测试 (需要后端运行)
```

当前状态: **125 vitest unit tests + 58 Playwright E2E tests, 13 pages building**

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI |
| ORM | SQLAlchemy 2.x |
| 验证 | Pydantic v2 |
| 数据库 | SQLite (dev) / PostgreSQL (prod) |
| 迁移 | Alembic |
| 前端框架 | Next.js 15 |
| UI 库 | React 19 |
| 语言 | TypeScript |
| 样式 | 内联 CSS + 设计令牌 |
| 测试 | pytest, Vitest, Playwright |

## 安全特性

- **CORS 配置**: 生产环境限制允许的源
- **安全头**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection
- **请求日志**: 慢请求告警
- **状态令牌**: HMAC 签名防 CSRF
- **输入验证**: Pydantic 模式验证所有输入

## 监控与运维

### 日志级别

- `INFO`: 启动、关闭、重要业务事件
- `WARNING`: 慢请求、验证失败、业务逻辑错误
- `ERROR`: 未处理异常、系统错误

### 性能指标

- 请求处理时间 (X-Process-Time 头)
- 数据库查询性能
- 批次执行进度

## 贡献

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 许可证

MIT

## 相关文档

- [产品规格 (spec.md)](./spec.md) - 完整 V1 产品规范
- [Sprint 1 完成报告](./SPRINT1_COMPLETE.md) - Sprint 1 交付详情
- [API 参考 (backend/API_REFERENCE.md)](./backend/API_REFERENCE.md) - 完整 API 文档
- [前端架构 (frontend/FRONTEND_ARCHITECTURE.md)](./frontend/FRONTEND_ARCHITECTURE.md) - 前端技术文档
