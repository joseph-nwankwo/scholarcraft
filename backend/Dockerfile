# ────────────────────────────────────────────────────────────────────────────
# Stage 1 — install ALL deps (including dev) for build
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps-all
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — install only production deps
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps-prod
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --omit=dev

# ────────────────────────────────────────────────────────────────────────────
# Stage 3 — build TypeScript → JavaScript
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps-all /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Rewrite @/* path aliases in compiled output to relative paths
RUN npx tsc-alias -p tsconfig.json

# ────────────────────────────────────────────────────────────────────────────
# Stage 4 — minimal production runner
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Production node_modules
COPY --from=deps-prod /app/node_modules ./node_modules

# Compiled Prisma client (generated in build stage)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client/runtime ./node_modules/@prisma/client/runtime

# Compiled application
COPY --from=build /app/dist ./dist

# Prisma schema (needed for migrations and runtime engine lookup)
COPY prisma ./prisma

# Package manifest (needed for some runtime introspection)
COPY package.json ./

COPY scripts/start.sh ./scripts/start.sh
RUN chmod +x ./scripts/start.sh && chown -R appuser:appgroup /app
USER appuser

EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

CMD ["sh", "scripts/start.sh"]
