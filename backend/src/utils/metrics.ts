/**
 * Prometheus metrics for LectureCraft.
 * Run `npm install` to install prom-client (it's in package.json dependencies).
 * If prom-client is unavailable, all metrics are no-ops and /metrics returns a 503.
 */

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const promClient: any = (() => { try { return require('prom-client') } catch { return null } })()

export const register: any = promClient?.register ?? null
export const available = promClient !== null

if (promClient) {
  promClient.collectDefaultMetrics({ register: promClient.register, prefix: 'nodejs_' })
}

function makeCounter(name: string, help: string, labelNames: string[]): any {
  if (!promClient) return null
  return new promClient.Counter({ name, help, labelNames, registers: [promClient.register] })
}

function makeHistogram(name: string, help: string, labelNames: string[], buckets: number[]): any {
  if (!promClient) return null
  return new promClient.Histogram({ name, help, labelNames, buckets, registers: [promClient.register] })
}

function makeGauge(name: string, help: string, labelNames?: string[]): any {
  if (!promClient) return null
  return new promClient.Gauge({ name, help, labelNames: labelNames ?? [], registers: [promClient.register] })
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
export const httpRequestsTotal   = makeCounter('http_requests_total', 'Total HTTP requests', ['method', 'route', 'status'])
export const httpRequestDuration = makeHistogram('http_request_duration_seconds', 'HTTP request duration (s)', ['method', 'route', 'status'], [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10])

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiGenerationTotal    = makeCounter('ai_generation_total', 'Total AI generations', ['module_type', 'provider', 'status'])
export const aiGenerationDuration = makeHistogram('ai_generation_duration_seconds', 'AI generation duration (s)', ['module_type', 'provider'], [0.5, 1, 2, 5, 10, 30, 60, 120])
export const aiTokensUsed         = makeCounter('ai_tokens_used_total', 'Total AI tokens consumed', ['provider', 'model'])

// ── WebSocket ─────────────────────────────────────────────────────────────────
export const wsConnectionsActive = makeGauge('websocket_connections_active', 'Active WebSocket connections')
export const wsMessagesTotal     = makeCounter('websocket_messages_total', 'Total WebSocket messages', ['event', 'direction'])

// ── Queue ─────────────────────────────────────────────────────────────────────
export const queueJobsTotal = makeCounter('bullmq_jobs_total', 'Total BullMQ jobs processed', ['queue', 'status'])
export const queueWaiting   = makeGauge('bullmq_queue_waiting', 'Waiting jobs per queue', ['queue'])

// ── Database ──────────────────────────────────────────────────────────────────
export const dbQueryDuration = makeHistogram('db_query_duration_seconds', 'DB query duration (s)', ['operation', 'model'], [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1])

// ── Business ──────────────────────────────────────────────────────────────────
export const activeUsersTotal      = makeGauge('active_users_total', 'Users active in last 15 min')
export const documentsCreatedTotal = makeCounter('documents_created_total', 'Total documents created', ['type'])

// ── Helper ────────────────────────────────────────────────────────────────────
export function recordHttpMetrics(
  method:    string,
  route:     string,
  status:    number,
  startTime: [number, number],
): void {
  if (!httpRequestsTotal || !httpRequestDuration) return
  const [seconds, nanoseconds] = process.hrtime(startTime)
  const duration = seconds + nanoseconds / 1e9
  const labels = { method, route, status: String(status) }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  httpRequestsTotal.inc(labels)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  httpRequestDuration.observe(labels, duration)
}
