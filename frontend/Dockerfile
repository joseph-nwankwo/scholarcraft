# ────────────────────────────────────────────────────────────────────────────
# Stage 1 — install deps
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ────────────────────────────────────────────────────────────────────────────
# Stage 2 — build Vite application
# ────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build args become VITE_ env vars at build time
ARG VITE_API_URL
ARG VITE_APP_NAME=LectureCraft
ARG VITE_SENTRY_DSN
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
RUN npm run build

# ────────────────────────────────────────────────────────────────────────────
# Stage 3 — nginx static server
# ────────────────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner
# Remove default config
RUN rm /etc/nginx/conf.d/default.conf
# Copy nginx config
COPY nginx/app.conf /etc/nginx/conf.d/app.conf
# Copy built static assets
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
