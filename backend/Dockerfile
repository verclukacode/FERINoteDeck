# syntax=docker/dockerfile:1

# ---- Stage 1: install all deps (runs prisma generate via postinstall) ----
FROM node:20-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
# Copy prisma schema so postinstall (prisma generate) can find it
COPY backend/prisma ./backend/prisma
RUN yarn install --immutable \
   # Ensure the dir exists even when yarn hoists everything to root
   && mkdir -p backend/node_modules

# ---- Stage 2: compile TypeScript ----
FROM node:20-alpine AS builder
WORKDIR /app
RUN corepack enable
COPY package.json .yarnrc.yml ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
COPY backend/src ./backend/src
COPY backend/prisma ./backend/prisma
COPY backend/tsconfig.json ./backend/
# Runs: prisma generate && tsc
RUN yarn workspace notedeck-backend build

# ---- Stage 3: production runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
COPY backend/package.json ./backend/
# Carry node_modules from deps (includes prisma generated client)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules
# Compiled output
COPY --from=builder /app/backend/dist ./backend/dist
# Schema needed by prisma db push at startup
COPY --from=builder /app/backend/prisma ./backend/prisma

VOLUME ["/app/backend/uploads"]
EXPOSE 3001

# Run schema push (idempotent) before starting the server
CMD ["sh", "-c", "node_modules/.bin/prisma db push --skip-generate --schema=backend/prisma/schema.prisma && node backend/dist/index.js"]
