# LectureCraft — Deployment Guide

## Prerequisites

- Docker 24+, Docker Compose v2+
- Node.js 20+ (for local development)
- PostgreSQL 16 (provided via Docker)
- Redis 7 (provided via Docker)
- An AWS account with S3 bucket (for file uploads)
- SMTP credentials (SendGrid, AWS SES, etc.)
- AI API keys (OpenAI and/or Anthropic recommended)

---

## Local Development

### 1. Clone and install

```bash
git clone https://github.com/your-org/lecturecraft.git
cd lecturecraft
npm run install:all        # installs both backend and frontend deps
```

### 2. Configure environment

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your local values
```

Minimum required variables for local dev:
```env
DATABASE_URL=postgresql://lecturercraft:lecturercraft_dev@localhost:5432/lecturercraft
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=any-32-char-local-dev-secret-here
JWT_REFRESH_SECRET=any-32-char-local-dev-secret-here-2
COOKIE_SECRET=any-32-char-local-cookie-secret
FRONTEND_URL=http://localhost:3001
```

### 3. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 4. Run migrations

```bash
cd backend
npm run db:migrate        # creates tables and runs all migrations
npm run db:generate       # regenerates Prisma client
```

### 5. Start dev servers

```bash
# From repo root:
npm run dev               # concurrently starts backend (4000) + frontend (3001)
```

---

## Docker Compose (Full Stack)

```bash
docker compose up -d      # starts: postgres, redis, backend, frontend, prometheus, grafana
```

Services available:
- Frontend: http://localhost:3001
- Backend API: http://localhost:4000
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

---

## Production Deployment

### Option A — Docker Compose on a VPS/Cloud VM

#### 1. Provision server

Recommended: Ubuntu 22.04 LTS, 4 vCPU, 8GB RAM, 100GB SSD

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker $USER
```

#### 2. Clone and configure

```bash
git clone https://github.com/your-org/lecturecraft.git /opt/lecturecraft
cd /opt/lecturecraft

# Create production env file
cp .env.production.example .env.production
# Fill in all production values
```

#### 3. SSL certificates

Using Let's Encrypt with Certbot:
```bash
apt install certbot
certbot certonly --standalone -d lecturecraft.app -d www.lecturecraft.app
# Certs saved to /etc/letsencrypt/live/lecturecraft.app/
mkdir -p /opt/lecturecraft/nginx/ssl
ln -s /etc/letsencrypt/live/lecturecraft.app/fullchain.pem /opt/lecturecraft/nginx/ssl/
ln -s /etc/letsencrypt/live/lecturecraft.app/privkey.pem /opt/lecturecraft/nginx/ssl/
```

#### 4. Deploy

```bash
cd /opt/lecturecraft

# Pull and build images
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml build

# Run migrations (first deploy only, or after schema changes)
docker compose -f docker-compose.prod.yml run --rm backend \
  sh -c "npx prisma migrate deploy && node dist/app.js --seed"

# Start all services
docker compose -f docker-compose.prod.yml up -d
```

#### 5. Verify

```bash
curl https://lecturecraft.app/health
# Expected: {"status":"ok","timestamp":"...","version":"1.0.0","uptime":N}
```

### Option B — Kubernetes (GKE / EKS / AKS)

#### 1. Prerequisites

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml

# Create secrets (replace with actual values)
kubectl create secret generic lecturecraft-secrets \
  --namespace lecturecraft \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=JWT_ACCESS_SECRET="..." \
  # ... other secrets from k8s/secrets.example.yaml
```

#### 2. Deploy infrastructure

```bash
kubectl apply -f k8s/postgres-statefulset.yaml
kubectl apply -f k8s/redis-deployment.yaml
```

#### 3. Deploy application

```bash
# Update image tags in deployment files, then:
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

#### 4. Run migrations via Job

```bash
kubectl create job --namespace lecturecraft db-migrate \
  --image=ghcr.io/your-org/lecturecraft-backend:latest \
  -- sh -c "npx prisma migrate deploy"
```

### Option C — Managed Platforms

**Backend → Railway**
```
1. Connect GitHub repo
2. Set root directory to /backend
3. Add all env vars from .env.production.example
4. Deploy command: npm run build && npm start
5. Set DATABASE_URL to Railway's PostgreSQL plugin
```

**Frontend → Vercel**
```
1. Import GitHub repo
2. Set root directory to /frontend
3. Build command: npm run build
4. Output directory: dist
5. Set VITE_API_URL to your Railway backend URL
```

---

## Environment Variables Reference

See `.env.example` in the repository root for the complete annotated list.

**Critical production variables:**
| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection string |
| `JWT_ACCESS_SECRET` | ✅ | Min 32 chars, random |
| `JWT_REFRESH_SECRET` | ✅ | Min 32 chars, random, different from above |
| `COOKIE_SECRET` | ✅ | Min 32 chars, for signed cookies |
| `FRONTEND_URL` | ✅ | e.g. `https://lecturecraft.app` |
| `OPENAI_API_KEY` | ✅ | AI generation |
| `STRIPE_SECRET_KEY` | ⚠️ | Required if using Stripe billing |
| `AWS_S3_BUCKET` | ⚠️ | Required for file uploads |
| `SMTP_HOST` | ⚠️ | Required for email notifications |
| `SENTRY_DSN` | ○ | Error tracking (recommended in production) |

---

## Post-Deployment Checks

```bash
# 1. Health endpoints
curl https://lecturecraft.app/health
curl https://lecturecraft.app/health/ready

# 2. API responds
curl https://lecturecraft.app/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"..."}' | jq .

# 3. WebSocket accessible
# Open browser DevTools → Network → filter WS

# 4. Prometheus scraping
curl http://localhost:9090/api/v1/targets  # shows lecturecraft_backend as UP

# 5. Grafana dashboard loads
# Navigate to http://your-grafana:3000 → LectureCraft dashboard
```

---

## Automated Backups

Set up a cron job on the production server:
```bash
# /etc/cron.d/lecturecraft-backup
0 2 * * * root cd /opt/lecturecraft && ./backend/scripts/backup.sh >> /var/log/lecturecraft-backup.log 2>&1
```

Configure S3 upload in backup script:
```env
AWS_S3_BACKUP_BUCKET=lecturecraft-backups
BACKUP_RETENTION_DAYS=30
```
