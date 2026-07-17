# orbeAI backend

API real da orbeAI, responsável por autenticação, persistência, chamadas de modelos, orbeRouter, memória, artifacts e integração com os produtos da orbeOne.

## status atual

Fundação inicial criada:

- FastAPI;
- endpoint `/health`;
- endpoint `/v1/status`;
- configuração via `.env`;
- CORS;
- SQLAlchemy preparado;
- Alembic preparado;
- Dockerfile;
- teste básico de healthcheck.

## rodando localmente

A partir da raiz do repositório:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Teste:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/v1/status
```

## rodando com Docker Compose

A partir da raiz do repositório:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Endpoints:

```text
http://localhost:8000/health
http://localhost:8000/docs
```

## variáveis principais

```text
APP_ENV=local
DATABASE_URL=postgresql+psycopg://orbeai:orbeai@orbeai-postgres:5432/orbeai
BACKEND_CORS_ORIGINS=http://localhost:8080,http://localhost:5173,http://localhost:3000
JWT_SECRET=dev-only-change-me
```

## próximos passos

1. Criar modelos SQLAlchemy mínimos.
2. Criar primeira migration real.
3. Criar endpoints de projects/chats/messages.
4. Criar auth básica.
5. Criar primeiro provider real de modelo.
