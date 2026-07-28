import { marked } from 'marked'
import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'
import { auditService } from '../audit/audit.service'
import { generatePDF } from '../document/pdf.service'
import { generateDOCX } from '../document/docx.service'
import path from 'path'
import fs from 'fs/promises'

// Synchronous parse — no async extensions registered
function mdToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false }) as string
}

export type ExportFormat = 'pdf' | 'docx' | 'html' | 'markdown' | 'txt'

interface ExportOptions {
  format: ExportFormat
  templateId?: string
  watermark?: string
  includeHeader?: boolean
  includeFooter?: boolean
}

export const enhancedExportService = {
  async export(documentId: string, userId: string, opts: ExportOptions): Promise<{ fileBuffer: Buffer; mimeType: string; filename: string }> {
    const doc = await prisma.document.findFirst({
      where: { id: documentId, userId },
      include: { currentVersion: true, user: { select: { name: true } }, course: { select: { code: true, title: true } } },
    })
    if (!doc) throw AppError.notFound('Document')

    const content = doc.currentVersion?.markdownContent ?? doc.content ?? ''
    const title = doc.title

    let template = null
    if (opts.templateId) {
      template = await prisma.exportTemplate.findFirst({ where: { id: opts.templateId } })
    } else {
      template = await prisma.exportTemplate.findFirst({ where: { institutionId: doc.institutionId, isDefault: true } })
    }

    const headerHtml = template?.headerHtml ?? buildDefaultHeader(title, doc.user?.name ?? '', doc.course?.code)
    const footerHtml = template?.footerHtml ?? buildDefaultFooter(template?.includePageNumbers ?? true)
    const watermark = opts.watermark ?? template?.watermark ?? undefined

    let fileBuffer: Buffer
    let mimeType: string
    let ext: string

    switch (opts.format) {
      case 'pdf': {
        const html = buildHtmlDocument(content, title, headerHtml, footerHtml, watermark, template)
        fileBuffer = await generatePDF(html)
        mimeType = 'application/pdf'
        ext = 'pdf'
        break
      }
      case 'docx': {
        fileBuffer = await generateDOCX(title, content)
        mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ext = 'docx'
        break
      }
      case 'html': {
        const html = buildHtmlDocument(content, title, headerHtml, footerHtml, watermark, template)
        fileBuffer = Buffer.from(html, 'utf-8')
        mimeType = 'text/html'
        ext = 'html'
        break
      }
      case 'markdown': {
        const md = buildMarkdownDocument(title, content, doc.user?.name ?? '', doc.course?.code)
        fileBuffer = Buffer.from(md, 'utf-8')
        mimeType = 'text/markdown'
        ext = 'md'
        break
      }
      case 'txt': {
        const text = stripMarkdown(content)
        fileBuffer = Buffer.from(`${title}\n${'='.repeat(title.length)}\n\n${text}`, 'utf-8')
        mimeType = 'text/plain'
        ext = 'txt'
        break
      }
      default:
        throw AppError.badRequest(`Unsupported format: ${opts.format as string}`)
    }

    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}`
    void auditService.log({ userId, action: 'export.completed', resource: 'document', resourceId: documentId, metadata: { format: opts.format } })

    return { fileBuffer, mimeType, filename }
  },

  async processQueuedExport(exportId: string, documentId: string, userId: string, format: ExportFormat) {
    try {
      await prisma.export.update({ where: { id: exportId }, data: { status: 'PROCESSING' } })
      const { fileBuffer, filename } = await this.export(documentId, userId, { format })

      // In production, upload to S3/GCS. Here we write to tmp and store path.
      const dir = path.join(process.cwd(), 'exports')
      await fs.mkdir(dir, { recursive: true })
      const filePath = path.join(dir, `${exportId}_${filename}`)
      await fs.writeFile(filePath, fileBuffer)

      await prisma.export.update({
        where: { id: exportId },
        data: { status: 'COMPLETED', fileUrl: `/api/exports/download/${exportId}`, fileKey: filePath },
      })
    } catch (err) {
      await prisma.export.update({
        where: { id: exportId },
        data: { status: 'FAILED' },
      })
      throw err
    }
  },

  async getDownloadPath(exportId: string, userId: string) {
    const exp = await prisma.export.findFirst({ where: { id: exportId, userId } })
    if (!exp) throw AppError.notFound('Export')
    if (exp.status !== 'COMPLETED' || !exp.fileKey) throw AppError.badRequest('Export not ready')
    return exp.fileKey
  },
}

function buildDefaultHeader(title: string, author: string, courseCode?: string | null): string {
  return `<div style="font-size:11px;color:#666;padding:8px 0;border-bottom:1px solid #ddd;margin-bottom:12px">
    <strong>${title}</strong>${courseCode ? ` — ${courseCode}` : ''}<span style="float:right">${author}</span>
  </div>`
}

function buildDefaultFooter(includePageNumbers: boolean): string {
  if (!includePageNumbers) return ''
  return `<div style="font-size:10px;color:#999;text-align:center;padding-top:8px;border-top:1px solid #eee">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
  </div>`
}

function buildHtmlDocument(
  markdown: string, title: string, header: string, footer: string,
  watermark: string | undefined, template: { primaryColor?: string | null; fontFamily?: string | null } | null
): string {
  const color = template?.primaryColor ?? '#334E68'
  const font = template?.fontFamily ?? "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"
  const watermarkCss = watermark
    ? `body::after{content:"${watermark}";position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:72px;color:rgba(0,0,0,0.05);z-index:0;pointer-events:none;white-space:nowrap;}`
    : ''

  const bodyHtml = mdToHtml(markdown)

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:${font};font-size:11.5pt;line-height:1.75;color:#1F2937;background:#fff}
  .page{padding:22mm 22mm 24mm;max-width:860px;margin:0 auto;position:relative;z-index:1}
  h1{font-size:22pt;font-weight:700;color:#111827;margin-bottom:0.6em;line-height:1.2}
  h2{font-size:16pt;font-weight:700;color:#111827;margin-top:2em;margin-bottom:0.5em;line-height:1.3}
  h3{font-size:13pt;font-weight:700;color:#111827;margin-top:1.6em;margin-bottom:0.4em}
  h4{font-size:11.5pt;font-weight:700;color:#111827;margin-top:1.2em;margin-bottom:0.3em}
  p{margin-bottom:1em}
  strong{font-weight:700;color:#111827}
  em{font-style:italic}
  a{color:${color};text-decoration:underline}
  ul,ol{margin:0.75em 0 0.75em 1.6em;padding:0}
  li{margin-bottom:0.3em}
  blockquote{border-left:4px solid #E2E8F0;background:#F8FAFC;margin:1.25em 0;padding:0.75em 1em;border-radius:0 6px 6px 0;color:#4B5563}
  blockquote p:last-child{margin-bottom:0}
  hr{border:none;border-top:1px solid #E2E8F0;margin:1.75em 0}
  code{background:#F1F5F9;border:1px solid #E2E8F0;padding:2px 5px;border-radius:4px;font-family:'Courier New',Courier,monospace;font-size:10pt}
  pre{background:#F1F5F9;border:1px solid #E2E8F0;padding:1em 1.2em;border-radius:6px;overflow-x:auto;margin:1em 0}
  pre code{background:none;border:none;padding:0;font-size:9.5pt}
  table{border-collapse:collapse;width:100%;margin:1.25em 0;font-size:10.5pt}
  th{background:${color};color:#fff;padding:8px 12px;text-align:left;font-weight:600}
  td{padding:7px 12px;border:1px solid #E2E8F0}
  tr:nth-child(even) td{background:#F8FAFC}
  img{max-width:100%}
  ${watermarkCss}
</style></head>
<body><div class="page">
  ${header}
  <div>${bodyHtml}</div>
  ${footer}
</div></body></html>`
}

function buildMarkdownDocument(title: string, content: string, author: string, courseCode?: string | null): string {
  const date = new Date().toLocaleDateString('en-NG')
  const meta = [`# ${title}`, '', `**Author:** ${author}`, courseCode ? `**Course:** ${courseCode}` : '', `**Date:** ${date}`, '---', ''].filter((l) => l !== undefined).join('\n')
  return meta + content
}

function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^\s*[-*+]\s/gm, '• ')
    .replace(/^\s*\d+\.\s/gm, '')
}
