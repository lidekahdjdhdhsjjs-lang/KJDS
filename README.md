# 跨境电商 AI 运营系统

基于 AI 的跨境电商选品、上架、运营一体化平台。支持 Shopee 单店铺运营，人工最终审核发布。

## 功能特性

- **AI 辅助选品**: 从 1688 智能推荐商品
- **一键上架**: 自动生成商品标题、描述、图片
- **人工审核**: 所有商品发布前需人工确认
- **店铺健康监控**: 实时追踪授权状态和健康度
- **完整审计**: 所有操作记录可追溯

## 快速开始

### 前置要求

- Docker & Docker Compose
- Python 3.12+
- Node.js 18+

### 启动步骤

```bash
# 1. 启动数据库
docker-compose up -d

# 2. 后端设置
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload

# 3. 前端设置 (新终端)
cd frontend
npm install
npm run dev
```

### 访问地址

| 服务 | 地址 |
|------|------|
| 首页 | http://localhost:3000 |
| Dashboard | http://localhost:3000/dashboard |
| 平台设置 | http://localhost:3000/settings/platform-connections |
| API 文档 | http://localhost:8000/docs |

## 项目结构

```
├── backend/           # FastAPI 后端
│   ├── app/
│   │   ├── api/       # API 路由
│   │   ├── models.py  # SQLAlchemy 模型
│   │   ├── repositories/
│   │   ├── services/
│   │   └── schemas/
│   ├── migrations/    # Alembic 迁移
│   └── tests/
├── frontend/          # Next.js 前端
│   ├── app/           # App Router 页面
│   ├── components/    # React 组件
│   └── lib/           # 工具库
├── docs/              # 项目文档
├── spec.md            # 产品规格说明
└── docker-compose.yml
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | FastAPI, SQLAlchemy 2.x, Pydantic |
| 数据库 | PostgreSQL (生产), SQLite (开发) |
| 缓存 | Redis |
| 前端 | Next.js 15, React 19, TypeScript |
| 测试 | pytest, Vitest |

## 测试

```bash
# 后端测试 (34 通过)
cd backend && source .venv/bin/activate
pytest tests/ -v

# 前端测试 (22+ 通过)
cd frontend && npm test
```

## Sprint 进度

### Sprint 1 (已完成) ✅

- [x] Store 授权管理
- [x] 健康状态监控
- [x] 审计日志记录
- [x] 事件追踪
- [x] 安全 State Token (HMAC签名)
- [x] 后端 API 端点 (34 tests)
- [x] 前端设置页面 (22+ tests)

### Sprint 2 (规划中)

- [ ] 选品批次管理 (OpportunityBatch)
- [ ] AI 选品推荐工作流
- [ ] 1688 商品采购集成
- [ ] Preflight 校验管道
- [ ] Shopee 发布流程

## 文档

- [产品规格 (spec.md)](./spec.md)
- [架构设计](./docs/ARCHITECTURE.md)
- [数据模型](./docs/DATA_MODEL.md)
- [Sprint 1 完成报告](./SPRINT1_COMPLETE.md)

## License

MIT
