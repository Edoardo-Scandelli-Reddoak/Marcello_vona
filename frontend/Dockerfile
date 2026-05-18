# --- Stage 1: dependencies ------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# --- Stage 2: build -------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Le NEXT_PUBLIC_* vengono inlineate nel bundle in fase di build:
# devono essere passate come ARG e poi riesposte come ENV.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MEDIA_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MEDIA_URL=$NEXT_PUBLIC_MEDIA_URL

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# --- Stage 3: runtime -----------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Re-inietto le env var anche a runtime (per server components / SSR).
ENV NEXT_TELEMETRY_DISABLED=1

# Copio solo ciò che serve per girare in produzione.
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Railway inietta $PORT; bisogna bindare lì sopra.
CMD ["sh", "-c", "npx next start -p ${PORT:-3000} -H 0.0.0.0"]
