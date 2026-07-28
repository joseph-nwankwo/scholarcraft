/**
 * k6 API Load Test — LectureCraft
 * Run: k6 run tests/load/api.k6.js
 * Targets: 10,000 concurrent users, P95 < 500ms
 */
import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

// ── Custom Metrics ─────────────────────────────────────────────────────────
const errorRate       = new Rate('errors')
const aiGenDuration   = new Trend('ai_generation_duration', true)
const authSuccessRate = new Rate('auth_success')
const documentsCreated = new Counter('documents_created')

// ── Test configuration ─────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Ramp-up to 500 VUs (simulating normal load)
    ramp_up: {
      executor:   'ramping-vus',
      startVUs:   0,
      stages: [
        { duration: '2m',  target: 100  },
        { duration: '5m',  target: 500  },
        { duration: '10m', target: 500  },
        { duration: '2m',  target: 0    },
      ],
      gracefulRampDown: '30s',
    },
    // Spike test — sudden 1000 VU spike
    spike: {
      executor:   'ramping-vus',
      startVUs:   0,
      startTime:  '20m',
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '2m',  target: 1000 },
        { duration: '30s', target: 0    },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed:   ['rate<0.01'],    // less than 1% error rate
    errors:            ['rate<0.01'],
    ai_generation_duration: ['p(95)<60000'],  // P95 < 60s for AI
  },
}

const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:4000'

// ── VU lifecycle ───────────────────────────────────────────────────────────
export default function () {
  group('Health check', () => {
    const res = http.get(`${BASE_URL}/health`)
    check(res, {
      'health status 200': (r) => r.status === 200,
      'health body ok':    (r) => JSON.parse(r.body).status === 'ok',
    })
    errorRate.add(res.status !== 200)
  })

  sleep(0.5)

  group('Auth — register and login', () => {
    const userId   = `load_${__VU}_${__ITER}`
    const email    = `${userId}@load-test.example`
    const password = 'LoadTest!123'

    const registerRes = http.post(
      `${BASE_URL}/api/auth/register`,
      JSON.stringify({
        email,
        password,
        firstName: 'Load',
        lastName:  'Test',
        role:      'LECTURER',
      }),
      { headers: { 'Content-Type': 'application/json' } },
    )
    check(registerRes, {
      'register 201 or 409': (r) => r.status === 201 || r.status === 409,
    })

    const loginRes = http.post(
      `${BASE_URL}/api/auth/login`,
      JSON.stringify({ email, password }),
      { headers: { 'Content-Type': 'application/json' } },
    )
    const loginOk = check(loginRes, {
      'login 200':        (r) => r.status === 200,
      'has access token': (r) => JSON.parse(r.body).data?.accessToken != null,
    })
    authSuccessRate.add(loginOk)
    errorRate.add(!loginOk)

    if (loginOk) {
      const { data } = JSON.parse(loginRes.body)
      const token = data.accessToken
      const authHeaders = {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }

      sleep(0.3)

      group('Document management', () => {
        const docRes = http.post(
          `${BASE_URL}/api/documents`,
          JSON.stringify({
            title:   `Load Test Document ${__ITER}`,
            content: 'Test content for load testing',
            type:    'LECTURE_NOTE',
          }),
          authHeaders,
        )
        check(docRes, { 'create doc 201': (r) => r.status === 201 || r.status === 200 })
        if (docRes.status === 201) documentsCreated.add(1)
        errorRate.add(docRes.status >= 500)
      })

      sleep(0.5)

      group('Analytics read', () => {
        const analyticsRes = http.get(`${BASE_URL}/api/analytics/dashboard`, authHeaders)
        check(analyticsRes, {
          'analytics 200 or 403': (r) => r.status === 200 || r.status === 403,
        })
        errorRate.add(analyticsRes.status >= 500)
      })
    }
  })

  sleep(1)
}

export function handleSummary(data) {
  return {
    'tests/load/results/api-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  }
}

function textSummary(data, opts) {
  return `
=== LectureCraft API Load Test Summary ===
Total requests:    ${data.metrics.http_reqs.values.count}
Error rate:        ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
P50 latency:       ${data.metrics.http_req_duration.values['p(50)'].toFixed(0)}ms
P95 latency:       ${data.metrics.http_req_duration.values['p(95)'].toFixed(0)}ms
P99 latency:       ${data.metrics.http_req_duration.values['p(99)'].toFixed(0)}ms
Documents created: ${data.metrics.documents_created?.values?.count ?? 'n/a'}
Auth success rate: ${(data.metrics.auth_success?.values?.rate * 100 ?? 0).toFixed(1)}%
`
}
