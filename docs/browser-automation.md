# 指纹浏览器池技术文档

## 概述

指纹浏览器池是跨境电商 AI 运营系统的关键基础设施，用于：

1. **多账号管理** - 防止平台关联封号
2. **市场调研** - 模拟不同地区用户访问
3. **竞品分析** - 获取真实区域定价信息
4. **数据采集** - 自动化商品信息抓取

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                    前端管理界面                              │
│  /settings/browser-profiles - 配置管理                      │
│  - 创建/编辑/删除浏览器配置                                   │
│  - 代理池管理                                                │
│  - 会话监控                                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    API 层                                    │
│  /api/v1/browser/*                                          │
│  - POST /profiles - 创建配置                                 │
│  - POST /sessions - 创建会话                                 │
│  - POST /sessions/{id}/scrape - 执行抓取                    │
│  - POST /sessions/{id}/scrape/shopee - Shopee商品           │
│  - POST /sessions/{id}/scrape/1688 - 1688商品               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 浏览器自动化服务                              │
│  BrowserAutomationService                                   │
│  - 配置文件管理                                              │
│  - 会话生命周期                                              │
│  - 指纹伪装注入                                              │
│  - 页面交互封装                                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Playwright 层                             │
│  - Chromium 浏览器实例                                       │
│  - 持久化上下文                                              │
│  - 代理配置                                                  │
│  - 反检测脚本                                                │
└─────────────────────────────────────────────────────────────┘
```

## 数据模型

### BrowserProfile (浏览器配置文件)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 主键 |
| name | String | 配置名称 |
| region | String | 目标地区 (SG/MY/TH/PH/VN/ID) |
| store_id | String | 关联店铺ID |
| user_agent | String | User-Agent |
| viewport_width | Integer | 视口宽度 |
| viewport_height | Integer | 视口高度 |
| timezone | String | 时区 |
| language | String | 语言 |
| webgl_vendor | String | WebGL 厂商 |
| webgl_renderer | String | WebGL 渲染器 |
| proxy_host | String | 代理地址 |
| proxy_port | Integer | 代理端口 |
| is_active | Boolean | 是否活跃 |
| is_locked | Boolean | 是否锁定 |

### BrowserSession (浏览器会话)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 会话ID |
| profile_id | String | 配置ID |
| task_type | String | 任务类型 |
| status | String | 状态 |
| pages_visited | Integer | 访问页面数 |
| bytes_transferred | Integer | 传输字节数 |
| started_at | DateTime | 开始时间 |
| ended_at | DateTime | 结束时间 |

### ProxyPool (代理池)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | String | 代理ID |
| host | String | 地址 |
| port | Integer | 端口 |
| proxy_type | String | 类型 (http/socks5) |
| country | String | 国家 |
| health_score | Float | 健康分数 |
| success_count | Integer | 成功次数 |
| failure_count | Integer | 失败次数 |

## 地区配置

```python
REGION_CONFIGS = {
    "SG": {
        "timezone": "Asia/Singapore",
        "language": "en-SG",
        "locale": "en_SG",
        "currency": "SGD",
    },
    "VN": {
        "timezone": "Asia/Ho_Chi_Minh",
        "language": "vi-VN",
        "locale": "vi_VN",
        "currency": "VND",
    },
    # ... 其他地区
}
```

## 反检测技术

### 1. WebDriver 隐藏
```javascript
Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
```

### 2. WebGL 指纹伪装
```javascript
WebGLRenderingContext.prototype.getParameter = function(parameter) {
    if (parameter === 37445) return 'Google Inc. (NVIDIA)';
    if (parameter === 37446) return 'ANGLE (NVIDIA GeForce GTX 1060)';
    return getParameter.call(this, parameter);
};
```

### 3. Canvas 噪声
```javascript
HTMLCanvasElement.prototype.toDataURL = function(type) {
    // 添加微小噪声
    const noise = String.fromCharCode(Math.random() * 10);
    return originalToDataURL.call(this, type).replaceAt(50, noise);
};
```

### 4. Audio 指纹
```javascript
// 添加微小频率偏移
oscillator.frequency = new Proxy(originalFrequency, {
    get: (target, prop) => {
        if (prop === 'value') {
            return target.value + (Math.random() - 0.5) * 0.0001;
        }
        return target[prop];
    }
});
```

## API 使用示例

### 创建浏览器配置

```bash
curl -X POST http://localhost:8000/api/v1/browser/profiles \
  -H "Content-Type: application/json" \
  -d '{
    "name": "越南店-竞品分析",
    "region": "VN",
    "store_id": "store_123"
  }'
```

### 创建会话并抓取

```python
import httpx

async def scrape_shopee_product(product_url: str):
    async with httpx.AsyncClient() as client:
        # 创建会话
        session_resp = await client.post(
            "http://localhost:8000/api/v1/browser/sessions",
            json={
                "profile_id": "profile_id",
                "task_type": "scrape",
                "headless": True,
            }
        )
        session_id = session_resp.json()["session_id"]

        # 抓取商品
        scrape_resp = await client.post(
            f"http://localhost:8000/api/v1/browser/sessions/{session_id}/scrape/shopee",
            json={"url": product_url}
        )

        # 关闭会话
        await client.post(
            f"http://localhost:8000/api/v1/browser/sessions/{session_id}/close"
        )

        return scrape_resp.json()
```

## 最佳实践

### 1. 配置管理

- 每个店铺建议配置 2-3 个独立配置
- 定期轮换指纹配置（建议每周）
- 锁定正在使用的配置防止冲突

### 2. 代理使用

- 优先使用住宅代理
- 保持健康分数 > 0.8
- 定期检查代理可用性

### 3. 会话管理

- 及时关闭不活跃会话
- 设置合理的超时时间
- 监控错误计数

### 4. 安全建议

- 不要在配置中存储敏感密码
- 使用环境变量管理代理凭证
- 定期审计访问日志

## 部署要求

### 系统依赖

```bash
# Ubuntu/Debian
apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2

# 安装 Playwright 浏览器
python -m playwright install chromium
```

### 环境变量

```bash
PROFILE_DIR=/data/browser_profiles
PROXY_USERNAME=xxx
PROXY_PASSWORD=xxx
```

## 监控与告警

### 关键指标

- 活跃会话数
- 平均响应时间
- 错误率
- 代理健康分数

### 告警规则

- 活跃会话 > 10: 警告
- 错误率 > 20%: 警告
- 代理健康分数 < 0.5: 严重

## 未来优化

1. **智能指纹生成** - 基于真实设备数据
2. **自动化轮换** - 定期自动更新指纹
3. **行为模拟** - 模拟真实用户行为
4. **验证码处理** - 集成验证码识别服务
