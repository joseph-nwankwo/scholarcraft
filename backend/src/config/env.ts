import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_ACCESS_SECRET:      z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET:     z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN:  z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // SSO — shared with uamsatech.com portal and LectureCraft; must NOT equal JWT_ACCESS_SECRET
  CRAFT_LAUNCH_SECRET: z.string().min(32, 'CRAFT_LAUNCH_SECRET must be at least 32 chars'),

  // Cookies
  // No default: a missing secret must fail startup validation (P0-02).
  COOKIE_SECRET:  z.string({ required_error: 'COOKIE_SECRET is required' }).min(32, 'COOKIE_SECRET must be at least 32 chars'),
  COOKIE_DOMAIN:  z.string().optional(),

  // App URLs
  FRONTEND_URL: z.string().default('http://localhost:3002'),
  APP_URL:      z.string().default('http://localhost:4001'),

  // SSO enforcement — when true, direct /register and /register-institution are
  // blocked; accounts come via the UAMSA Tech portal SSO launch.
  // AS-P0-SECURITY-006A: secure by default. Unset ⇒ disabled. Only the exact
  // strings 'true' or 'false' are accepted (z.coerce.boolean() treated
  // "false" as true and an absent value as false — fail-open).
  DISABLE_DIRECT_SIGNUP: z.enum(['true', 'false'], {
    errorMap: () => ({ message: "DISABLE_DIRECT_SIGNUP must be 'true' or 'false'" }),
  }).default('true').transform((v) => v === 'true'),

  // Central entitlement verification (AS-P0-SECURITY-006A) — the portal's
  // POST /api/internal/entitlements/verify endpoint and THIS product's own
  // service credential. Required: without them no session can be issued.
  CENTRAL_ENTITLEMENT_URL:            z.string().url('CENTRAL_ENTITLEMENT_URL must be an absolute URL'),
  CENTRAL_ENTITLEMENT_SERVICE_SECRET: z.string({ required_error: 'CENTRAL_ENTITLEMENT_SERVICE_SECRET is required' })
    .min(32, 'CENTRAL_ENTITLEMENT_SERVICE_SECRET must be at least 32 chars'),
  CENTRAL_ENTITLEMENT_TIMEOUT_MS:     z.coerce.number().int().min(500).max(15_000).default(5_000),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // AWS S3 / Cloudflare R2
  AWS_REGION:            z.string().default('auto'),
  AWS_ACCESS_KEY_ID:     z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET:         z.string().optional(),
  AWS_S3_ENDPOINT:       z.string().url().optional(),
  AWS_S3_PUBLIC_URL:     z.string().url().optional(),

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

// Exported so the schema can be unit-tested directly without triggering the
// process.exit() startup guard below.
export const envSchema = baseEnvSchema.superRefine((cfg, ctx) => {
  // P0-01: the SSO launch secret is shared with the portal and LectureSuite;
  // it must never double as this product's own token-signing secrets.
  if (cfg.CRAFT_LAUNCH_SECRET === cfg.JWT_ACCESS_SECRET || cfg.CRAFT_LAUNCH_SECRET === cfg.JWT_REFRESH_SECRET) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      path:    ['CRAFT_LAUNCH_SECRET'],
      message: 'CRAFT_LAUNCH_SECRET must differ from JWT_ACCESS_SECRET and JWT_REFRESH_SECRET',
    })
  }
  // AS-P0-SECURITY-006A: the entitlement service credential is single-purpose.
  if ([cfg.CRAFT_LAUNCH_SECRET, cfg.JWT_ACCESS_SECRET, cfg.JWT_REFRESH_SECRET, cfg.COOKIE_SECRET]
    .includes(cfg.CENTRAL_ENTITLEMENT_SERVICE_SECRET)) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      path:    ['CENTRAL_ENTITLEMENT_SERVICE_SECRET'],
      message: 'CENTRAL_ENTITLEMENT_SERVICE_SECRET must differ from CRAFT_LAUNCH_SECRET, JWT and cookie secrets',
    })
  }
  // The credential is sent to this URL: plaintext HTTP only outside production.
  if (cfg.NODE_ENV === 'production' && !cfg.CENTRAL_ENTITLEMENT_URL.startsWith('https://')) {
    ctx.addIssue({
      code:    z.ZodIssueCode.custom,
      path:    ['CENTRAL_ENTITLEMENT_URL'],
      message: 'CENTRAL_ENTITLEMENT_URL must use https in production',
    })
  }
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
