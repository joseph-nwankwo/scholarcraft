import { env } from '../../config/env'
import { logger } from '../../utils/logger'

// Lazy-load nodemailer only if SMTP is configured (avoids hard dependency)
async function getTransporter() {
  if (!env.SMTP_HOST || !env.SMTP_USER) return null
  const nodemailer = await import('nodemailer')
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  })
}

interface SendOptions {
  to: string
  subject: string
  html: string
  text?: string
}

async function send(opts: SendOptions) {
  const transporter = await getTransporter()

  if (!transporter) {
    // Development: log to console
    logger.info('📧 [EMAIL] (no SMTP configured)', {
      to: opts.to,
      subject: opts.subject,
    })
    return
  }

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
}

// ── Email Templates ───────────────────────────────────────────────────────────

function baseTemplate(body: string): string {
  return `<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LectureCraft</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;max-width:480px;margin:0 auto;padding:32px}
  .logo{font-size:20px;font-weight:700;color:#2563eb;margin-bottom:24px}
  h2{font-size:18px;font-weight:600;color:#111827;margin:0 0 8px}
  p{font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 16px}
  .btn{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;margin:8px 0 16px}
  .footer{font-size:12px;color:#9ca3af;margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px}
  .code{font-family:monospace;background:#f3f4f6;padding:12px 16px;border-radius:8px;font-size:16px;font-weight:700;letter-spacing:4px;text-align:center;margin:16px 0}
</style></head>
<body><div class="card">
  <div class="logo">⚡ LectureCraft</div>
  ${body}
  <div class="footer">This email was sent by LectureCraft. If you did not request this, please ignore it.<br>© ${new Date().getFullYear()} LectureCraft. All rights reserved.</div>
</div></body></html>`
}

export const emailService = {
  async sendVerification(to: string, name: string, token: string) {
    const link = `${env.FRONTEND_URL}/verify-email?token=${token}`
    await send({
      to,
      subject: 'Verify your LectureCraft email',
      html: baseTemplate(`
        <h2>Verify your email address</h2>
        <p>Hi ${name},</p>
        <p>Welcome to LectureCraft! Please verify your email address to activate your account.</p>
        <a href="${link}" class="btn">Verify Email Address</a>
        <p>Or paste this link in your browser:<br><a href="${link}">${link}</a></p>
        <p>This link expires in <strong>24 hours</strong>.</p>
      `),
    })
  },

  async sendPasswordReset(to: string, name: string, token: string) {
    const link = `${env.FRONTEND_URL}/reset-password?token=${token}`
    await send({
      to,
      subject: 'Reset your LectureCraft password',
      html: baseTemplate(`
        <h2>Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset the password for your LectureCraft account. Click the button below to create a new password.</p>
        <a href="${link}" class="btn">Reset Password</a>
        <p>Or paste this link in your browser:<br><a href="${link}">${link}</a></p>
        <p>This link expires in <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email.</p>
      `),
    })
  },

  async sendInvitation(to: string, institutionName: string, inviterName: string, token: string) {
    const link = `${env.FRONTEND_URL}/accept-invitation?token=${token}`
    await send({
      to,
      subject: `You've been invited to join ${institutionName} on LectureCraft`,
      html: baseTemplate(`
        <h2>You've been invited!</h2>
        <p><strong>${inviterName}</strong> has invited you to join <strong>${institutionName}</strong> on LectureCraft.</p>
        <a href="${link}" class="btn">Accept Invitation</a>
        <p>This invitation expires in <strong>7 days</strong>.</p>
      `),
    })
  },

  async sendScheduledReport(opts: {
    to: string; reportName: string; frequency: string
    buffer: Buffer; mimeType: string; filename: string
  }) {
    const transporter = await getTransporter()
    const freqLabel = opts.frequency.charAt(0) + opts.frequency.slice(1).toLowerCase()
    if (!transporter) {
      logger.info('📧 [EMAIL] Scheduled report (no SMTP)', { to: opts.to, report: opts.reportName })
      return
    }
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: opts.to,
      subject: `${freqLabel} Report: ${opts.reportName}`,
      html: baseTemplate(`
        <h2>${opts.reportName}</h2>
        <p>Your ${freqLabel.toLowerCase()} report from LectureCraft is attached. It covers your teaching activity, AI usage, and assessment data for the reporting period.</p>
        <p>Log in to your dashboard to view full analytics and manage your scheduled reports.</p>
        <a href="${env.FRONTEND_URL}/analytics/reports" class="btn">View Analytics</a>
      `),
      attachments: [{ filename: opts.filename, content: opts.buffer, contentType: opts.mimeType }],
    })
  },

  async sendWelcome(to: string, name: string, institutionName: string) {
    await send({
      to,
      subject: `Welcome to LectureCraft, ${name}!`,
      html: baseTemplate(`
        <h2>Welcome to LectureCraft!</h2>
        <p>Hi ${name},</p>
        <p>Your institution <strong>${institutionName}</strong> is now set up on LectureCraft. You can start generating AI-powered academic content right away.</p>
        <a href="${env.FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>
        <p>Here's what you can do:</p>
        <ul style="color:#4b5563;font-size:14px;line-height:1.8">
          <li>Generate lecture notes with AI</li>
          <li>Create assignments, exams, and rubrics</li>
          <li>Build course outlines</li>
          <li>Manage your courses and documents</li>
        </ul>
      `),
    })
  },
}
