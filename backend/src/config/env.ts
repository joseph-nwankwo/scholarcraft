import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET:      z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET:     z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Cookies
  COOKIE_SECRET:  z.string().default('change-me-in-production-cookie-secret-min-32'),
  COOKIE_DOMAIN:  z.string().optional(),

  // App URLs
  FRONTEND_URL: z.string().default('http://localhost:3002'),
  APP_URL:      z.string().default('http://localhost:4001'),

  // SSO enforcement
  DISABLE_DIRECT_SIGNUP: z.coerce.boolean().default(false),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // AWS S3
  AWS_REGION:            z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID:     z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET:         z.string().optional(),

  // AI Providers
  OPENAI_API_KEY:    z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  GOOGLE_AI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY:  z.string().optional(),

  // Literature search (optional — public tier works without a key but is heavily rate-limited)
  SEMANTIC_SCHOLAR_API_KEY: z.string().optional(),

  // SMTP (optional — emails logged to console in development)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('ScholarCraft <noreply@uamsatech.com>'),
  SMTP_SECURE: z.coerce.boolean().default(false),

  // Redis connection (optional, BullMQ workers gracefully disabled if absent)
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  // Billing / Payment providers
  STRIPE_SECRET_KEY:        z.string().optional(),
  STRIPE_WEBHOOK_SECRET:    z.string().optional(),
  PAYSTACK_SECRET_KEY:      z.string().optional(),
  FLUTTERWAVE_SECRET_KEY:   z.string().optional(),
  BILLING_DEFAULT_PROVIDER: z.enum(['stripe', 'paystack', 'flutterwave']).default('stripe'),
  TRIAL_DAYS:               z.coerce.number().default(14),

  // Sentry (optional)
  SENTRY_DSN: z.string().optional(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
