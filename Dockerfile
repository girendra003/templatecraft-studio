# syntax=docker/dockerfile:1
FROM --platform=$BUILDPLATFORM node:25-bookworm-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/index.html frontend/tsconfig*.json frontend/vite.config.ts ./
COPY frontend/src ./src
COPY frontend/public ./public
RUN npm run build

FROM python:3.12-slim-bookworm AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
LABEL org.opencontainers.image.title="TemplateCraft Studio" \
    org.opencontainers.image.description="Open-source PDF template editor" \
    org.opencontainers.image.source="https://github.com/girendra003/templatecraft-studio" \
    org.opencontainers.image.licenses="AGPL-3.0-only"
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && groupadd --gid 10001 templatecraft \
    && useradd --uid 10001 --gid templatecraft --no-create-home templatecraft
COPY app ./app
COPY assets ./assets
COPY examples ./examples
COPY LICENSE THIRD_PARTY.md README.md ./
COPY --from=frontend /app/react_dist ./app/react_dist
USER 10001:10001
EXPOSE 8008
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8008/api/health', timeout=2)"
# Sessions are process-local: keep a single worker.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8008", "--workers", "1", "--no-access-log"]
