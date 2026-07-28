import {
  Document, Paragraph, TextRun, HeadingLevel, Packer,
  AlignmentType, BorderStyle, ShadingType, LevelFormat,
} from 'docx'

interface DocxParagraph {
  type: 'heading1' | 'heading2' | 'heading3' | 'heading4' | 'paragraph' | 'bullet' | 'ordered' | 'blockquote' | 'code' | 'hr'
  text: string
  inlines?: InlineRun[]
}

interface InlineRun {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

function parseInline(text: string): InlineRun[] {
  const runs: InlineRun[] = []
  // Split on bold+italic, bold, italic, inline code
  const re = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push({ text: text.slice(last, m.index) })
    if (m[2]) runs.push({ text: m[2], bold: true, italic: true })
    else if (m[3]) runs.push({ text: m[3], bold: true })
    else if (m[4]) runs.push({ text: m[4], italic: true })
    else if (m[5]) runs.push({ text: m[5], code: true })
    last = m.index + m[0].length
  }
  if (last < text.length) runs.push({ text: text.slice(last) })
  return runs
}

function inlineToRuns(text: string, defaultOpts: { bold?: boolean; italic?: boolean; color?: string } = {}): TextRun[] {
  return parseInline(text).map((r) => new TextRun({
    text: r.text,
    bold: r.bold ?? defaultOpts.bold,
    italics: r.italic ?? defaultOpts.italic,
    color: defaultOpts.color,
    font: r.code ? 'Courier New' : undefined,
    size: r.code ? 20 : undefined,
    highlight: r.code ? 'lightGray' : undefined,
  }))
}

function parseParagraphs(content: string): DocxParagraph[] {
  const paras: DocxParagraph[] = []
  let inCode = false
  let codeLines: string[] = []

  for (const raw of content.split('\n')) {
    const line = raw

    // Code fence
    if (line.startsWith('```')) {
      if (inCode) {
        paras.push({ type: 'code', text: codeLines.join('\n') })
        codeLines = []
        inCode = false
      } else {
        inCode = true
      }
      continue
    }
    if (inCode) { codeLines.push(line); continue }

    // HR
    if (/^[-*_]{3,}$/.test(line.trim())) { paras.push({ type: 'hr', text: '' }); continue }

    // Headings
    if (line.startsWith('# '))    { paras.push({ type: 'heading1', text: line.slice(2).trim() }); continue }
    if (line.startsWith('## '))   { paras.push({ type: 'heading2', text: line.slice(3).trim() }); continue }
    if (line.startsWith('### '))  { paras.push({ type: 'heading3', text: line.slice(4).trim() }); continue }
    if (line.startsWith('#### ')) { paras.push({ type: 'heading4', text: line.slice(5).trim() }); continue }

    // Blockquote
    if (line.startsWith('> ')) { paras.push({ type: 'blockquote', text: line.slice(2).trim() }); continue }

    // Bullet list
    if (/^[-*+] /.test(line)) { paras.push({ type: 'bullet', text: line.replace(/^[-*+] /, '').trim() }); continue }

    // Ordered list
    if (/^\d+\. /.test(line)) { paras.push({ type: 'ordered', text: line.replace(/^\d+\. /, '').trim() }); continue }

    // Normal paragraph (skip blank lines)
    paras.push({ type: 'paragraph', text: line })
  }

  if (inCode && codeLines.length) paras.push({ type: 'code', text: codeLines.join('\n') })

  return paras
}

export async function generateDOCX(title: string, content: string): Promise<Buffer> {
  const numbering = {
    config: [
      {
        reference: 'bullet-list',
        levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
      {
        reference: 'ordered-list',
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  }

  const paras = parseParagraphs(content)

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 48, color: '111827' })],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
      spacing: { after: 300 },
    }),
    new Paragraph({ text: '' }),
  ]

  for (const p of paras) {
    switch (p.type) {
      case 'heading1':
        children.push(new Paragraph({
          children: [new TextRun({ text: p.text, bold: true, size: 44, color: '111827' })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 360, after: 120 },
        }))
        break
      case 'heading2':
        children.push(new Paragraph({
          children: [new TextRun({ text: p.text, bold: true, size: 32, color: '111827' })],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 480, after: 120 },
        }))
        break
      case 'heading3':
        children.push(new Paragraph({
          children: [new TextRun({ text: p.text, bold: true, size: 26, color: '111827' })],
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 360, after: 80 },
        }))
        break
      case 'heading4':
        children.push(new Paragraph({
          children: [new TextRun({ text: p.text, bold: true, size: 24, color: '374151' })],
          spacing: { before: 240, after: 60 },
        }))
        break
      case 'bullet':
        children.push(new Paragraph({
          children: inlineToRuns(p.text),
          numbering: { reference: 'bullet-list', level: 0 },
          spacing: { after: 60 },
        }))
        break
      case 'ordered':
        children.push(new Paragraph({
          children: inlineToRuns(p.text),
          numbering: { reference: 'ordered-list', level: 0 },
          spacing: { after: 60 },
        }))
        break
      case 'blockquote':
        children.push(new Paragraph({
          children: inlineToRuns(p.text, { italic: true, color: '4B5563' }),
          indent: { left: 720 },
          border: { left: { style: BorderStyle.SINGLE, size: 12, color: 'CBD5E1', space: 12 } },
          shading: { type: ShadingType.SOLID, fill: 'F8FAFC' },
          spacing: { before: 120, after: 120 },
        }))
        break
      case 'code':
        for (const codeLine of p.text.split('\n')) {
          children.push(new Paragraph({
            children: [new TextRun({ text: codeLine || ' ', font: 'Courier New', size: 19, color: '374151' })],
            shading: { type: ShadingType.SOLID, fill: 'F1F5F9' },
            spacing: { before: 0, after: 0, line: 240 },
            indent: { left: 360, right: 360 },
          }))
        }
        break
      case 'hr':
        children.push(new Paragraph({
          text: '',
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E2E8F0', space: 1 } },
          spacing: { before: 200, after: 200 },
        }))
        break
      case 'paragraph':
      default:
        children.push(new Paragraph({
          children: inlineToRuns(p.text),
          spacing: { after: p.text.trim() ? 160 : 0 },
        }))
    }
  }

  const doc = new Document({
    numbering,
    sections: [{ children }],
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 23, color: '1F2937' } },
      },
    },
  })

  return Packer.toBuffer(doc)
}
