# --- Stage 1: build the React SPA ---
FROM node:22-alpine AS web
WORKDIR /web
COPY frontend/package.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# --- Stage 2: FastAPI API serving the built SPA ---
FROM python:3.12-slim AS api
WORKDIR /app/backend
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
COPY backend/requirements.txt ./
RUN pip install -r requirements.txt
COPY backend/ ./
# SPA build lands where FRONTEND_DIST (../frontend/dist) points by default.
COPY --from=web /web/dist /app/frontend/dist

# Bind to 0.0.0.0 *inside* the container; publish to loopback on the host
# (see docker-compose.yml) to avoid exposing recon data publicly.
ENV HOST=0.0.0.0 PORT=8000 FRONTEND_DIST=../frontend/dist
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
