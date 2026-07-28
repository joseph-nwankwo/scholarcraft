# LectureCraft — Operations Guide

## Health Monitoring

### Endpoints

| Endpoint | Purpose | Used By |
|----------|---------|---------|
| `GET /health` | Basic liveness (always fast) | Docker HEALTHCHECK, nginx upstream check |
| `GET /health/ready` | Deep readiness (checks DB + Redis) | K8s readiness probe |
| `GET /metrics` | Prometheus metrics | Prometheus scraper |

### Key Metrics to Watch

| Metric | Alert Threshold | Severity |
|--------|----------------|----------|
| `http_req_failed_rate` | > 1% | Warning |
| `http_req_failed_rate` | > 5% | Critical |
| `http_request_duration_seconds{p95}` | > 500ms | Warning |
| `http_request_duration_seconds{p95}` | > 2s | Critical |
| `websocket_connections_active` | > 900 | Warning (capacity 1000) |
| `ai_generation_duration_seconds{p95}` | > 60s | Warning |
| `nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes` | > 80% | Warning |
| `bullmq_queue_waiting` | > 100 | Warning |
| `db_query_duration_seconds{p95}` | > 100ms | Warning |

### Grafana Dashboards

Navigate to `http://grafana:3000` → LectureCraft folder:
- **Application Dashboard**: HTTP rates, latency, WebSocket, AI metrics, Node.js runtime
- **Database Dashboard**: Query duration, connection pool, table sizes
- **Redis Dashboard**: Memory usage, hit rate, queue depths

---

## Logging

### Log Format (Production — JSON)

```json
{
  "level": "info",
  "message": "POST /api/documents 201 45ms",
  "service": "lecturecraft-api",
  "env": "production",
  "requestId": "a1b2c3d4-...",
  "correlationId": "a1b2c3d4-...",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

### Log Levels

| Level | When Used |
|-------|-----------|
| `error` | Unhandled exceptions, DB disconnection, queue failures |
| `warn`  | Recoverable issues (Redis timeout, optional feature failed) |
| `info`  | Server start/stop, migrations, key user actions |
| `http`  | Every HTTP request (filtered by Morgan) |
| `debug` | Dev only — SQL queries, detailed flow |

### Viewing Logs

```bash
# Docker Compose
docker compose logs -f backend

# Production (with jq)
docker compose -f docker-compose.prod.yml logs backend | jq '.'

# Kubernetes
kubectl logs -n lecturecraft deploy/backend -f
```

### ELK Integration

Ship logs to Elasticsearch by adding a Filebeat sidecar or configuring
Winston to write to a file, then tailing with Filebeat:

```yaml
# docker-compose.prod.yml addition
filebeat:
  image: elastic/filebeat:8.12.0
  volumes:
    - /var/lib/docker/containers:/var/lib/docker/containers:ro
    - ./monitoring/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
```

---

## Incident Response

### Runbook: High Error Rate (> 5%)

1. **Identify scope**: Is it one route or all routes?
   ```bash
   docker compose logs backend | jq 'select(.level=="error")' | tail -50
   ```
2. **Check database**: Can the backend connect?
   ```bash
   curl http://localhost:4000/health/ready
   ```
3. **Check recent deploys**: Was a deployment made in the last 30 minutes?
   ```bash
   docker compose ps
   docker image ls | head -10
   ```
4. **Rollback if needed**:
   ```bash
   IMAGE_TAG=<previous-tag> docker compose -f docker-compose.prod.yml up -d backend
   ```

### Runbook: Database Unreachable

1. Check PostgreSQL container:
   ```bash
   docker compose ps postgres
   docker compose logs postgres | tail -30
   ```
2. Test connection:
   ```bash
   docker compose exec postgres pg_isready -U lecturercraft
   ```
3. If crashed, restart:
   ```bash
   docker compose restart postgres
   ```
4. If data corruption suspected, restore from backup:
   ```bash
   ./backend/scripts/restore.sh ./backup/lecturercraft_YYYYMMDD_HHMMSS.sql.gz
   ```

### Runbook: Memory Leak Detected (Heap > 80%)

1. Check heap metrics in Grafana
2. Identify the growing heap with:
   ```bash
   docker compose exec backend kill -USR2 1  # trigger V8 heap snapshot if configured
   ```
3. Restart backend to recover memory while investigating:
   ```bash
   docker compose restart backend
   ```
4. Review recent code changes for missing `await`, unclosed streams, or accumulating event listeners

### Runbook: AI Generation Failing

1. Check AI provider status (OpenAI: status.openai.com, Anthropic: status.anthropic.com)
2. Check API key validity:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.error // "OK"'
   ```
3. Verify rate limits in Grafana (`ai_generation_total` with `status=error` label)
4. Fall back to a different provider by updating `AI_DEFAULT_PROVIDER` env var and restarting

---

## Scaling

### Horizontal Scaling (Docker Compose)

```bash
# Scale backend to 4 replicas
docker compose -f docker-compose.prod.yml up -d --scale backend=4 --no-deps backend
```

### Kubernetes HPA

The HPA (`k8s/hpa.yaml`) automatically scales backend 2→10 pods based on CPU (65%) and memory (75%).

Manual scale:
```bash
kubectl scale deployment backend -n lecturecraft --replicas=6
```

### Database Connection Pooling

For high concurrency, deploy PgBouncer as a sidecar or standalone service:
```yaml
# Add to docker-compose.prod.yml
pgbouncer:
  image: bitnami/pgbouncer:1.23.1
  environment:
    POSTGRESQL_HOST: postgres
    POSTGRESQL_PORT: 5432
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 500
    PGBOUNCER_DEFAULT_POOL_SIZE: 25
```

Update `DATABASE_URL` to point to PgBouncer (port 5432) instead of Postgres directly.

### Redis Cluster

For > 10,000 concurrent users, upgrade Redis from single-instance to Redis Cluster or use a managed service (ElastiCache, Upstash).

---

## Backup & Restore

### Manual Backup

```bash
./backend/scripts/backup.sh [output-dir]
# Default output: ./backup/lecturercraft_YYYYMMDD_HHMMSS.sql.gz
```

### Automated Daily Backup

```bash
# Cron (runs at 2am daily)
0 2 * * * cd /opt/lecturecraft && ./backend/scripts/backup.sh ./backup \
  >> /var/log/lecturecraft-backup.log 2>&1
```

### Restore

```bash
./backend/scripts/restore.sh ./backup/lecturercraft_20240115_020000.sql.gz
```

### Verify Backup Integrity

```bash
gunzip -t ./backup/lecturercraft_YYYYMMDD_HHMMSS.sql.gz && echo "Backup OK"
```

---

## Security Operations

### Rotating Secrets

When rotating JWT secrets:
1. Update `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in env
2. Restart backend: `docker compose restart backend`
3. All existing sessions immediately invalidated — users must log in again
4. Communicate planned maintenance window to users

### Monitoring for Attacks

Key signals in Prometheus/Grafana:
- Spike in `http_requests_total{route="/api/auth/login"}` → brute force attempt
- Many 400s from a single IP → malformed input / scanning
- Sudden increase in `ai_generation_total` → API key abuse

Nginx rate limiting (`limit_req_zone`) will auto-block IPs exceeding thresholds.

### Certificate Renewal

Let's Encrypt auto-renewal via Certbot:
```bash
certbot renew --dry-run   # test renewal
# Add to cron:
0 12 * * * certbot renew --quiet && docker compose exec nginx nginx -s reload
```

---

## Maintenance Mode

To put the app in maintenance mode (returns 503 to all users):

```bash
# Add an upstream override to nginx config
cat > /opt/lecturecraft/nginx/maintenance.conf << 'EOF'
server {
  listen 80 default_server;
  return 503;
  error_page 503 /maintenance.html;
  location = /maintenance.html {
    root /usr/share/nginx/html;
    internal;
  }
}
EOF
docker compose exec nginx nginx -s reload
```

Disable maintenance:
```bash
rm /opt/lecturecraft/nginx/maintenance.conf
docker compose exec nginx nginx -s reload
```
