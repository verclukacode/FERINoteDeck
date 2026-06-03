# syntax=docker/dockerfile:1

# ---- Stage 1: build React app ----
FROM node:24-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
# prisma schema is required by backend's postinstall (prisma generate)
COPY backend/prisma ./backend/prisma
# --mount=type=cache shares the Yarn download cache across rebuilds so packages
# are read from disk instead of re-downloaded when yarn.lock hasn't changed.
RUN --mount=type=cache,target=/root/.yarn,sharing=locked \
   YARN_CACHE_FOLDER=/root/.yarn yarn install --immutable
COPY frontend/ ./frontend/

# Firebase config is baked in at build time via Vite env vars
ARG VITE_FIREBASE_API_KEY
ARG VITE_FIREBASE_AUTH_DOMAIN
ARG VITE_FIREBASE_PROJECT_ID
ARG VITE_FIREBASE_STORAGE_BUCKET
ARG VITE_FIREBASE_MESSAGING_SENDER_ID
ARG VITE_FIREBASE_APP_ID

RUN yarn workspace notedeck-frontend build

# ---- Stage 2: serve with nginx ----
FROM nginx:alpine
# curl is bundled with nginx:alpine but not needed to serve static files.
# Remove it to eliminate CVE-2026-6276 and CVE-2026-5773 (no fix in Alpine 3.23 yet).
RUN apk del curl libcurl
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
