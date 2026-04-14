# 生产部署指南

本文档提供跨境电商 AI 运营系统的生产部署详细说明。

## 部署架构

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Nginx/Traefik │────▶│   Next.js App   │     │   PostgreSQL    │
│   (反向代理)     │     │   (Port 3000)   │     │   (Port 5432)   │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐     ┌─────────────────┐
                        │   FastAPI App   │     │     Redis       │
                        │   (Port 8000)   │────▶│   (Port 6379)   │
                        └─────────────────┘     └─────────────────┘
```

## 1. 服务器要求

### 最低配置
- CPU: 2 核
- 内存: 4 GB
- 存储: 50 GB SSD
- 操作系统: Ubuntu 22.04 LTS

### 推荐配置
- CPU: 4 核
- 内存: 8 GB
- 存储: 100 GB SSD

## 2. 环境准备

### 2.1 安装系统依赖

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Python 3.12
sudo apt install -y software-properties-common
sudo add-apt-repository ppa:deadsnakes/ppa
sudo apt install -y python3.12 python3.12-venv python3.12-dev

# 安装 Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# 安装 Redis (可选)
sudo apt install -y redis-server

# 安装 Nginx
sudo apt install -y nginx
```

### 2.2 配置 PostgreSQL

```bash
# 创建数据库和用户
sudo -u postgres psql
CREATE USER shopee_ai_ops WITH PASSWORD 'your_secure_password';
CREATE DATABASE shopee_ai_ops OWNER shopee_ai_ops;
GRANT ALL PRIVILEGES ON DATABASE shopee_ai_ops TO shopee_ai_ops;
\q

# 启动 PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

## 3. 应用部署

### 3.1 克隆代码

```bash
# 创建应用目录
sudo mkdir -p /opt/shopee-ai-ops
sudo chown $USER:$USER /opt/shopee-ai-ops

# 克隆代码
git clone https://github.com/your-org/shopee-ai-ops.git /opt/shopee-ai-ops
cd /opt/shopee-ai-ops
```

### 3.2 后端部署

```bash
cd /opt/shopee-ai-ops/backend

# 创建虚拟环境
python3.12 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -e .

# 配置环境变量
cp .env.example .env
nano .env  # 编辑配置

# 运行迁移
alembic upgrade head

# 测试启动
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 3.3 前端部署

```bash
cd /opt/shopee-ai-ops/frontend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
nano .env.local  # 编辑配置

# 构建生产版本
npm run build

# 测试启动
npm start
```

## 4. 进程管理

### 4.1 使用 systemd (后端)

创建 `/etc/systemd/system/shopee-api.service`:

```ini
[Unit]
Description=Shopee AI Ops API
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/shopee-ai-ops/backend
Environment="PATH=/opt/shopee-ai-ops/backend/.venv/bin"
ExecStart=/opt/shopee-ai-ops/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable shopee-api
sudo systemctl start shopee-api
```

### 4.2 使用 systemd (前端)

创建 `/etc/systemd/system/shopee-frontend.service`:

```ini
[Unit]
Description=Shopee AI Ops Frontend
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/shopee-ai-ops/frontend
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable shopee-frontend
sudo systemctl start shopee-frontend
```

## 5. Nginx 配置

创建 `/etc/nginx/sites-available/shopee-ai-ops`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # 健康检查
    location /health {
        proxy_pass http://127.0.0.1:8000/health;
        access_log off;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/shopee-ai-ops /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 6. SSL 证书

使用 Let's Encrypt:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 7. 备份策略

### 7.1 数据库备份

创建 `/opt/shopee-ai-ops/scripts/backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U shopee_ai_ops shopee_ai_ops | gzip > "$BACKUP_DIR/shopee_ai_ops_$DATE.sql.gz"

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

### 7.2 配置定时任务

```bash
# 编辑 crontab
crontab -e

# 添加每天凌晨 2 点备份
0 2 * * * /opt/shopee-ai-ops/scripts/backup-db.sh
```

## 8. 监控

### 8.1 日志

```bash
# 查看后端日志
sudo journalctl -u shopee-api -f

# 查看前端日志
sudo journalctl -u shopee-frontend -f

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 8.2 健康检查

```bash
# 检查后端健康
curl http://localhost:8000/health/detailed

# 检查前端
curl http://localhost:3000
```

## 9. 故障恢复

### 9.1 服务无法启动

```bash
# 检查状态
sudo systemctl status shopee-api
sudo systemctl status shopee-frontend

# 检查日志
sudo journalctl -u shopee-api -n 100
sudo journalctl -u shopee-frontend -n 100

# 检查端口
sudo netstat -tulpn | grep LISTEN
```

### 9.2 数据库连接问题

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试连接
psql -U shopee_ai_ops -d shopee_ai_ops -h localhost
```

### 9.3 恢复数据库

```bash
gunzip -c /opt/backups/postgresql/shopee_ai_ops_YYYYMMDD_HHMMSS.sql.gz | psql -U shopee_ai_ops shopee_ai_ops
```

## 10. 安全加固

### 10.1 防火墙配置

```bash
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 10.2 安全检查清单

- [ ] 更改所有默认密码
- [ ] 启用 HTTPS
- [ ] 配置 CORS 限制
- [ ] 设置安全的 session secret
- [ ] 配置防火墙
- [ ] 启用数据库连接加密
- [ ] 定期更新系统补丁
- [ ] 配置日志轮转

## 11. 性能优化

### 11.1 后端

- 使用 `--workers 4` 启动多个工作进程
- 配置 PostgreSQL 连接池
- 启用查询缓存

### 11.2 前端

- 启用 Next.js 图片优化
- 配置 CDN 加速静态资源
- 启用 gzip 压缩

### 11.3 数据库

- 配置合适的 `shared_buffers`
- 创建必要的索引
- 定期运行 `VACUUM ANALYZE`
