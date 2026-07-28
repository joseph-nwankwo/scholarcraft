import puppeteer from 'puppeteer'

export async function generatePDF(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded' })

    const pdf = await page.pdf({
      format: 'A4',
      margin: { top: '24mm', right: '20mm', bottom: '24mm', left: '20mm' },
      printBackground: true,
    })

    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

export function contentToHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12pt; line-height: 1.6; color: #1a1a2e; }
    h1 { font-size: 22pt; color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 8px; }
    h2 { font-size: 16pt; color: #1e40af; margin-top: 24px; }
    h3 { font-size: 13pt; color: #1d4ed8; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 10pt; }
    pre { background: #f1f5f9; padding: 16px; border-radius: 8px; overflow-x: auto; }
    blockquote { border-left: 4px solid #2563eb; padding-left: 16px; color: #475569; margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #2563eb; color: white; padding: 8px 12px; text-align: left; }
    td { padding: 8px 12px; border: 1px solid #e2e8f0; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div>${content.replace(/\n/g, '<br>')}</div>
</body>
</html>`
}
