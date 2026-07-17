FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    HERMES_HOME=/var/lib/orbe-cognition/hermes

RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app

RUN pip install --upgrade pip \
    && pip install .

RUN useradd --create-home --uid 10001 orbe \
    && mkdir -p /var/lib/orbe-cognition/hermes \
    && chown -R orbe:orbe /app /var/lib/orbe-cognition

USER orbe

EXPOSE 8081

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8081", "--workers", "1"]
