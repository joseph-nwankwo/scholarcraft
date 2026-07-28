/**
 * k6 AI Generation Load Test — LectureCraft
 * Run: k6 run tests/load/ai-generation.k6.js
 * Target: 100 AI generations/minute sustained
 */
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'

const aiSuccessRate  = new Rate('ai_success')
const aiDuration     = new Trend('ai_duration_ms', true)
const aiGenTotal     = new Counter('ai_generations_total')
const aiErrorRate    = new Rate('ai_errors')

export const options = {
  scenarios: {
    // Constant rate of ~100 AI generations per minute
    ai_constant_rate: {
      executor:   'constant-arrival-rate',
      rate:       100,
      timeUnit:   '1m',
      duration:   '10m',
      preAllocatedVUs: 20,
      maxVUs:     50,
    },
  },
  thresholds: {
    ai_success:          ['rate>0.90'],          // 90%+ must succeed
    ai_errors:           ['rate<0.10'],
    ai_duration_ms:      ['p(95)<60000'],        // P95 < 60s
    http_req_duration:   ['p(95)<120000'],       // including network
  },
}

const BASE_URL = __ENV.BASE_URL ?? 'http://localhost:4000'
const TOKEN    = __ENV.TEST_TOKEN ?? ''

const AI_PROMPTS = [
  'Generate a 3-paragraph introduction to photosynthesis for second-year biology students.',
  'Create 5 multiple choice questions about the French Revolution at the UNDERSTAND level.',
  'Write a lesson plan outline for teaching linear algebra to engineering freshmen.',
  'Summarize the key themes of Things Fall Apart for a Nigerian literature class.',
  'Generate assessment rubric criteria for a research methodology essay.',
]

export default function () {
  const prompt  = AI_PROMPTS[__ITER % AI_PROMPTS.length]
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
  }

  const start = Date.now()
  const res = http.post(
    `${BASE_URL}/api/ai/stream`,
    JSON.stringify({
      prompt,
      systemPrompt: 'You are a Nigerian university teaching assistant.',
      moduleType:   'question-generator',
    }),
    { headers, timeout: '120s' },
  )
  const duration = Date.now() - start
  aiDuration.add(duration)

  const success = check(res, {
    'AI generation 200':      (r) => r.status === 200,
    'has content':            (r) => r.body.length > 50,
    'no server error':        (r) => r.status !== 500,
  })

  aiSuccessRate.add(success)
  aiErrorRate.add(!success)
  if (success) aiGenTotal.add(1)

  if (!success) {
    console.error(`AI gen failed [VU ${__VU}]: ${res.status} — ${res.body.substring(0, 200)}`)
  }

  // Brief pause between requests per VU to avoid socket exhaustion
  sleep(0.5)
}
