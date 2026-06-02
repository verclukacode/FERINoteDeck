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
RUN yarn install --immutable
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
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
