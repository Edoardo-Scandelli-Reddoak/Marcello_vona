# syntax=docker/dockerfile:1
# --- Stage 1: dependencies ------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# --- Stage 2: build -------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Le NEXT_PUBLIC_* vengono inlineate nel bundle a build-time.
# Vanno passate come build-args (Railway le mappa automaticamente dalle
# Variables del servizio: vedi DEPLOY_RAILWAY.md).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MEDIA_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `output: 'standalone'` in next.config.mjs → genera .next/standalone con
# solo i node_modules effettivamente importati (10x più piccolo).
RUN npm run build

# --- Stage 3: runtime -----------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Standalone output: server.js + node_modules minimal.
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Railway inietta $PORT dinamicamente.
ENV PORT=3000
EXPOSE 3000
CMD ["sh", "-c", "node server.js"]
