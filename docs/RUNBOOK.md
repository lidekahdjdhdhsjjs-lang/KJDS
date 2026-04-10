# Runbook

## Backend
```bash
cd /media/li/软件/跨境电商/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
fastapi dev app/main.py
```

## Frontend
```bash
cd /media/li/软件/跨境电商/frontend
npm install
npm run dev
```

## Infra
```bash
docker compose up -d
```

## Verify
- Open `http://localhost:8000/health`
- Open `http://localhost:3000/dashboard`
- Run `./.venv/bin/python -m pytest tests/test_api.py` in `backend/`
- Run `npm test -- --run` in `frontend/`
