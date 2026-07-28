import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/design-system/buttons/Button'
import { cn } from '@/lib/utils'
import type { InstitutionType } from '@/features/settings/pages/InstitutionSettingsPage'
import {
  type GradeBand,
  GRADE_SCALES,
  INSTITUTION_TYPE_OPTIONS,
  sortedBands,
  bandLabel,
  getGrade,
  loadCustomBands,
} from '@/lib/grading'

// ── Constants ──────────────────────────────────────────────────────────────────

const ROWS_PAGE1 = 27
const ROWS_REST  = 35
const SEMESTERS  = ['HARMATTAN', 'RAIN', 'FIRST', 'SECOND'] as const
const API_BASE   = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api') as string

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormState {
  institutionType: InstitutionType
  universityName: string
  motto: string
  courseTitle: string
  courseCode: string
  units: string
  hostCollege: string
  hostDept: string
  servedDept: string
  semester: string
  session: string
  examDate: string
  passmark: string
  lecturer: string
  hod: string
  dean: string
}

interface StudentRow {
  id: number
  sn: string
  name: string
  matno: string
  ca: string
  exam: string
  abs: boolean
  examAbs: boolean
}

interface ComputedRow extends StudentRow {
  caNum: number | null
  examNum: number | null
  total: number | null
  grade: string
}

interface ResultState {
  form: FormState
  students: StudentRow[]
  logoUrl: string | null
  customBands: GradeBand[]
}

function paginateStudents(rows: ComputedRow[]): ComputedRow[][] {
  if (rows.length === 0) return [[]]
  const pages: ComputedRow[][] = [rows.slice(0, ROWS_PAGE1)]
  let i = ROWS_PAGE1
  while (i < rows.length) { pages.push(rows.slice(i, i + ROWS_REST)); i += ROWS_REST }
  return pages
}

// ── Inline A4 CSS ─────────────────────────────────────────────────────────────

const MS_STYLES = `
  .ms-a4 {
    width:210mm; min-height:0; background:#fff;
    box-shadow:0 2px 12px rgba(0,0,0,.15);
    padding:10mm 17mm; font-family:Arial,sans-serif;
    font-size:8pt; color:#000; position:relative;
    overflow:hidden; box-sizing:border-box; margin:0 auto 20px;
  }
  .ms-pg-bar { display:flex; justify-content:space-between; align-items:baseline;
    font-size:7pt; color:#555; margin-bottom:2px; }
  .ms-pg-bar.first-page { justify-content:flex-end; }
  .ms-header { text-align:center; margin-bottom:4px; }
  .ms-uni-name { font-family:'Times New Roman',serif; font-size:17pt; font-weight:bold; line-height:1.2; }
  .ms-sheet-title { font-size:12pt; font-weight:bold; margin-bottom:1px; }
  .ms-subtitle { font-size:7pt; margin-bottom:4px; }
  .ms-cont-bar { display:flex; justify-content:space-between; align-items:baseline;
    font-size:9pt; font-weight:bold; border-bottom:.5px solid #888;
    margin-bottom:4px; padding-bottom:2px; }
  .ms-cont-pg { font-size:7pt; font-weight:normal; color:#555; }
  .ms-info-table { width:100%; border-collapse:collapse; margin-bottom:3px; font-size:8pt; }
  .ms-info-table td { border:.7px solid #000; padding:2px 3px; }
  .ms-info-label { font-weight:bold; white-space:nowrap; background:#f5f5f5; padding:2px 12px; }
  .ms-main-table { width:100%; border-collapse:collapse; font-size:7.5pt; table-layout:fixed; }
  .ms-main-table th { border:.7px solid #000; padding:2px; text-align:center;
    background:#e8e8e8; font-weight:bold; white-space:normal; line-height:1.2; }
  .ms-main-table td { border:.7px solid #000; padding:0 2px; text-align:center;
    height:5.5mm; vertical-align:middle; }
  .ms-main-table .ms-name-td { text-align:left; padding-left:3px; overflow:hidden; }
  .ms-fail-cell { color:red; }
  .ms-sig-table { width:100%; border-collapse:collapse; font-size:8pt; margin-top:4px; }
  .ms-sig-table th { border:.7px solid #000; padding:2px 4px;
    background:#e8e8e8; font-weight:bold; text-align:center; }
  .ms-sig-table td { border:.7px solid #000; padding:0 4px; height:5.5mm; vertical-align:middle; }
  .ms-role-td { font-weight:bold; white-space:nowrap; }
  .ms-summary-area { display:flex; margin-top:3px; align-items:flex-start; justify-content:center; gap:40px; }
  .ms-summary-table { border-collapse:collapse; font-size:7.5pt; width:300px; table-layout:fixed; }
  .ms-summary-table td { border:.7px solid #000; padding:1.5px 5px; text-align:center; white-space:nowrap; }
  .ms-summary-hdr { font-weight:bold; background:#e8e8e8; text-align:center; }
  .ms-summary-col-hdr { font-weight:bold; background:#e8e8e8; }
  .ms-absent-cell { color:#cc6600; font-weight:bold; }
  .ms-total-cell { font-weight:bold; }
  .ms-pages-wrap.plain .ms-info-label { background:#fff; }
  .ms-pages-wrap.plain .ms-main-table th { background:#fff; }
  .ms-pages-wrap.plain .ms-sig-table th { background:#fff; }
  .ms-pages-wrap.plain .ms-summary-hdr,
  .ms-pages-wrap.plain .ms-summary-col-hdr { background:#fff; }
  .ms-pages-wrap.plain .ms-main-table tr { background:transparent !important; }
  .ms-pages-wrap.plain .ms-main-table td { background:transparent !important; }
  @media print {
    @page { size:A4 portrait; margin:10mm 17mm; }
    * { -webkit-print-color-adjust:exact !important; print-color-adjust:exact !important; }
    .ms-no-print { display:none !important; }
    .ms-a4 { width:100% !important; min-height:0 !important; box-shadow:none !important;
      padding:0 !important; margin:0 !important;
      page-break-after:always !important; break-after:page !important; }
    .ms-a4:last-child { page-break-after:avoid !important; break-after:avoid !important; }
    .ms-info-label { background:#f5f5f5 !important; }
    .ms-main-table th { background:#e8e8e8 !important; }
    .ms-sig-table th { background:#e8e8e8 !important; }
    .ms-summary-hdr, .ms-summary-col-hdr { background:#e8e8e8 !important; }
    .ms-pages-wrap.plain .ms-info-label { background:#fff !important; }
    .ms-pages-wrap.plain .ms-main-table th { background:#fff !important; }
    .ms-pages-wrap.plain .ms-sig-table th { background:#fff !important; }
    .ms-pages-wrap.plain .ms-summary-hdr,
    .ms-pages-wrap.plain .ms-summary-col-hdr { background:#fff !important; }
    .ms-pages-wrap.plain .ms-main-table tr { background:transparent !important; }
    .ms-pages-wrap.plain .ms-main-table td { background:transparent !important; }
  }
`

// ── Input tab type ─────────────────────────────────────────────────────────────

type InputTab = 'manual' | 'paste'

// ── Main page ──────────────────────────────────────────────────────────────────

export default function MarkSheetPage() {
  const [inputTab,  setInputTab]  = useState<InputTab>('paste')
  const [logoUrl,   setLogoUrl]   = useState<string | null>(null)
  const [form, setForm] = useState<FormState>({
    institutionType: 'UNIVERSITY',
    universityName: '',
    motto: '',
    courseTitle: '', courseCode: '', units: '',
    hostCollege: '', hostDept: '', servedDept: '',
    semester: 'HARMATTAN', session: '', examDate: '',
    passmark: '40',
    lecturer: '', hod: '', dean: '',
  })
  const [students, setStudents] = useState<StudentRow[]>(() =>
    Array.from({ length: 8 }, (_, i) => ({
      id: i + 1, sn: String(i + 1), name: '', matno: '', ca: '', exam: '', abs: false, examAbs: false,
    }))
  )
  const [customBands, setCustomBands] = useState<GradeBand[]>(
    () => loadCustomBands('UNIVERSITY')
  )
  const [pasteRaw, setPasteRaw] = useState('')
  const [result,   setResult]   = useState<ResultState | null>(null)
  const [error,    setError]    = useState('')
  const [coloured, setColoured] = useState(true)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('accessToken') ?? ''
    if (!token) return
    void fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.ok ? r.json() : null)
      .then((data: {
        user?: {
          personalInstitutionName?: string | null
          personalInstitutionMotto?: string | null
          personalInstitutionLogoUrl?: string | null
          personalInstitutionType?: string | null
          institution?: { name?: string | null; institutionType?: string | null } | null
        }
      } | null) => {
        if (!data?.user) return
        const { personalInstitutionName, personalInstitutionMotto, personalInstitutionLogoUrl, personalInstitutionType, institution } = data.user
        // Institution type: prefer user-level override, fall back to the institution's type
        const resolvedType = (personalInstitutionType ?? institution?.institutionType ?? 'UNIVERSITY') as InstitutionType
        const scale = GRADE_SCALES[resolvedType]
        setForm((p) => ({
          ...p,
          institutionType: resolvedType,
          universityName:  personalInstitutionName ?? institution?.name ?? p.universityName,
          motto:           personalInstitutionMotto ?? p.motto,
          passmark:        String(scale.defaultPass),
        }))
        setCustomBands(loadCustomBands(resolvedType))
        if (personalInstitutionLogoUrl) setLogoUrl(personalInstitutionLogoUrl)
      })
      .catch(() => { /* silently skip if not logged in */ })
  }, [])

  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((p) => ({ ...p, [k]: v }))
  }

  function addStudent() {
    setStudents((p) => [
      ...p,
      { id: Date.now(), sn: String(p.length + 1), name: '', matno: '', ca: '', exam: '', abs: false, examAbs: false },
    ])
  }

  function removeStudent(id: number) { setStudents((p) => p.filter((s) => s.id !== id)) }

  function updateSt<K extends keyof StudentRow>(id: number, k: K, v: StudentRow[K]) {
    setStudents((p) => p.map((s) => s.id === id ? { ...s, [k]: v } : s))
  }

  function parsePaste(raw: string): StudentRow[] {
    return raw.trim().split('\n').map((line, i) => {
      const p      = line.split('\t')
      const caRaw  = (p[3] || '').trim()
      const exRaw  = (p[4] || '').trim()
      const caAbs  = caRaw.toUpperCase() === 'ABS'
      const exAbs  = exRaw.toUpperCase() === 'ABS'
      return {
        id: i + 1, sn: (p[0] || '').trim() || String(i + 1),
        name: (p[1] || '').trim(), matno: (p[2] || '').trim(),
        ca: caAbs ? '' : caRaw, exam: exAbs ? '' : exRaw,
        abs: caAbs || exAbs, examAbs: exAbs,
      }
    }).filter((s) => s.name || s.matno)
  }

  async function downloadTemplate() {
    const { utils, writeFile } = await import('xlsx')
    const wb = utils.book_new()
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['INSTITUTION TYPE', form.institutionType],
      ['UNIVERSITY NAME', ''],
      ['MOTTO',           ''],
      ['COURSE TITLE',    ''],
      ['COURSE CODE',     ''],
      ['UNITS',           ''],
      ['HOST COLLEGE',    ''],
      ['HOST DEPT',       ''],
      ['SERVED DEPT',     ''],
      ['SEMESTER',        'HARMATTAN'],
      ['SESSION',         ''],
      ['EXAM DATE',       ''],
      ['MIN PASS MARK',   '40'],
      ['LECTURER',        ''],
      ['HOD',             ''],
      ['DEAN',            ''],
    ]), 'Meta')
    utils.book_append_sheet(wb, utils.aoa_to_sheet([
      ['S/N', 'NAME OF STUDENT', 'MAT NO.', 'CA', 'EXAM SCORE'],
      ['1', '', '', '', ''],
      ['2', '', '', '', ''],
      ['3', '', '', '', ''],
    ]), 'Students')
    writeFile(wb, 'MarkSheet_Template.xlsx')
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const { read, utils } = await import('xlsx')
      const wb = read(await file.arrayBuffer())
      const toRows = (s: ReturnType<typeof utils.aoa_to_sheet>) =>
        utils.sheet_to_json<(string | number)[]>(s, { header: 1, defval: '' })

      const metaSheet = wb.Sheets['Meta'] ?? wb.Sheets[wb.SheetNames[0]]
      if (metaSheet) {
        const meta: Partial<FormState> = {}
        toRows(metaSheet).forEach((row) => {
          const key = String(row[0] ?? '').toUpperCase().trim()
          const val = String(row[1] ?? '')
          if      (key.includes('INSTITUTION TYPE')) meta.institutionType = val as InstitutionType
          else if (key.includes('UNIVERSITY'))   meta.universityName = val
          else if (key === 'MOTTO')              meta.motto         = val
          else if (key.includes('COURSE TITLE')) meta.courseTitle   = val
          else if (key.includes('COURSE CODE'))  meta.courseCode    = val
          else if (key === 'UNITS')              meta.units         = val
          else if (key.includes('HOST COLLEGE')) meta.hostCollege   = val
          else if (key.includes('HOST DEPT'))    meta.hostDept      = val
          else if (key.includes('SERVED DEPT'))  meta.servedDept    = val
          else if (key.includes('SEMESTER'))     meta.semester      = val || 'HARMATTAN'
          else if (key.includes('SESSION'))      meta.session       = val
          else if (key.includes('EXAM DATE'))    meta.examDate      = val
          else if (key.includes('PASS MARK'))    meta.passmark      = val || '40'
          else if (key.includes('LECTURER'))     meta.lecturer      = val
          else if (key === 'HOD')                meta.hod           = val
          else if (key.includes('DEAN'))         meta.dean          = val
        })
        setForm((p) => ({ ...p, ...meta }))
      }

      const studSheet = wb.Sheets['Students'] ?? wb.Sheets[wb.SheetNames[1]]
      if (studSheet) {
        const rows = toRows(studSheet).slice(1).filter((r) => String(r[1] ?? '').trim())
        if (rows.length > 0) {
          setStudents(rows.map((r, i) => {
            const caRaw = String(r[3] ?? '').trim()
            const exRaw = String(r[4] ?? '').trim()
            const caAbs = caRaw.toUpperCase() === 'ABS'
            const exAbs = exRaw.toUpperCase() === 'ABS'
            return {
              id: Date.now() + i, sn: String(r[0] ?? String(i + 1)),
              name: String(r[1] ?? '').trim(), matno: String(r[2] ?? '').trim(),
              ca: caAbs ? '' : caRaw, exam: exAbs ? '' : exRaw,
              abs: caAbs || exAbs, examAbs: exAbs,
            }
          }))
          setInputTab('manual')
        }
      }
      setError('')
    } catch (err) {
      setError('Could not read Excel file: ' + (err as Error).message)
    }
  }

  const pm = parseInt(form.passmark) || 40

  function liveCalc(s: StudentRow) {
    if (s.abs) return { total: null, grade: 'ABS' }
    const ca   = s.ca   !== '' ? Number(s.ca)   : null
    const exam = s.exam !== '' ? Number(s.exam) : null
    const total = ca !== null && exam !== null ? ca + exam : null
    return { total, grade: total !== null ? getGrade(total, customBands, pm) : '' }
  }

  function generate() {
    setError('')
    const sts = inputTab === 'paste'
      ? parsePaste(pasteRaw)
      : students.filter((s) => s.name.trim() || s.matno.trim())
    if (sts.length === 0) { setError('No student data found.'); return }
    setResult({ form: { ...form }, students: sts, logoUrl, customBands: customBands.map((b) => ({ ...b })) })
    setTimeout(() => document.getElementById('ms-preview')?.scrollIntoView({ behavior: 'smooth' }), 100)
  }

  function handlePrint() {
    const wrap = document.querySelector<HTMLElement>('.ms-pages-wrap')
    if (!wrap) return

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Mark Sheet${result?.form.universityName ? ' — ' + result.form.universityName : ''}</title>
  <base href="${window.location.origin}/">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #f0f0f0; }
    ${MS_STYLES}
  </style>
</head>
<body>
  ${wrap.outerHTML}
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); window.close(); }, 300);
    });
  </script>
</body>
</html>`

    const win = window.open('', '_blank', 'width=900,height=700,scrollbars=yes')
    if (!win) { alert('Please allow pop-ups for this site to enable printing.'); return }
    win.document.write(html)
    win.document.close()
  }

  // CSS class helpers (small scope, not worth Tailwind for print-critical form)
  const fi   = 'border border-input rounded-lg px-3 py-1.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring w-full'
  const fl   = 'text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block'
  const card = 'bg-card border border-border rounded-xl p-4 mb-4'

  return (
    <>
      <style>{MS_STYLES}</style>

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className="ms-no-print px-6 py-5 border-b border-border bg-background">
        <h1 className="text-lg font-semibold text-foreground">Mark Sheet Generator</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Generate an official A4 course marks sheet — print or save as PDF</p>
      </div>

      <div className="ms-no-print overflow-y-auto flex-1 px-6 py-5 max-w-4xl">

        {/* Course info */}
        <div className={card}>
          <p className={cn(fl, 'mb-3')}>Course Information</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              ↑ Upload Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => void downloadTemplate()}>
              ↓ Download Template
            </Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
              onChange={(e) => void handleExcelUpload(e)} />
          </div>

          <div className="mb-3">
            <label className={fl}>Institution Type</label>
            <select className={fi} value={form.institutionType}
              onChange={(e) => {
                const t = e.target.value as InstitutionType
                setForm((p) => ({ ...p, institutionType: t, passmark: String(GRADE_SCALES[t].defaultPass) }))
                setCustomBands(loadCustomBands(t))
              }}>
              {INSTITUTION_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className={fl}>Institution Name</label>
              <input className={fi} value={form.universityName}
                onChange={(e) => setF('universityName', e.target.value)}
                placeholder="e.g. Gregory University, Uturu" />
            </div>
            <div>
              <label className={fl}>Motto</label>
              <input className={fi} value={form.motto}
                onChange={(e) => setF('motto', e.target.value)}
                placeholder="e.g. Knowledge for Tomorrow" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            {([['Course Title', 'courseTitle'], ['Course Code', 'courseCode'], ['Units', 'units']] as const).map(([lbl, key]) => (
              <div key={key}>
                <label className={fl}>{lbl}</label>
                <input className={fi} value={form[key]} onChange={(e) => setF(key, e.target.value)} placeholder={lbl} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-3">
            {([['Host College', 'hostCollege'], ['Host Dept', 'hostDept'], ['Served Dept', 'servedDept']] as const).map(([lbl, key]) => (
              <div key={key}>
                <label className={fl}>{lbl}</label>
                <input className={fi} value={form[key]} onChange={(e) => setF(key, e.target.value)} placeholder={lbl} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={fl}>Semester</label>
              <select className={fi} value={form.semester} onChange={(e) => setF('semester', e.target.value)}>
                {SEMESTERS.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            {([['Session', 'session'], ['Exam Date', 'examDate'], ['Min Pass Mark', 'passmark']] as const).map(([lbl, key]) => (
              <div key={key}>
                <label className={fl}>{lbl}</label>
                <input className={fi} value={form[key]} onChange={(e) => setF(key, e.target.value)}
                  placeholder={key === 'passmark' ? '40' : lbl}
                  type={key === 'passmark' ? 'number' : 'text'} min="1" max="100" />
              </div>
            ))}
          </div>
        </div>

        {/* Signatories */}
        <div className={card}>
          <p className={cn(fl, 'mb-3')}>Signatories</p>
          <div className="grid grid-cols-3 gap-3">
            {([['Lecturer', 'lecturer'], ['H.O.D', 'hod'], ['Dean', 'dean']] as const).map(([lbl, key]) => (
              <div key={key}>
                <label className={fl}>{lbl}</label>
                <input className={fi} value={form[key]} onChange={(e) => setF(key, e.target.value)}
                  placeholder={`Name of ${lbl}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Student data */}
        <div className={card}>
          <p className={cn(fl, 'mb-3')}>Student Data</p>

          <div className="flex gap-0 mb-4 border-b border-border">
            {(['paste', 'manual'] as InputTab[]).map((tab) => (
              <button key={tab} type="button"
                onClick={() => setInputTab(tab)}
                className={cn(
                  'px-5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors capitalize',
                  inputTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}>
                {tab === 'manual' ? 'Manual Input' : 'Paste from Excel'}
              </button>
            ))}
          </div>

          {inputTab === 'manual' && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs min-w-160">
                  <thead>
                    <tr className="bg-muted/40">
                      {['S/N', 'Name of Student', 'Mat No.', 'CA', 'Exam Score', 'ABS', 'Total', 'Grade', ''].map((h) => (
                        <th key={h} className="border border-border px-2 py-1.5 text-center font-semibold text-muted-foreground whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const { total, grade } = liveCalc(s)
                      const fail = grade === 'F' || grade === 'ABS'
                      return (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="border border-border p-0.5">
                            <input value={s.sn} onChange={(e) => updateSt(s.id, 'sn', e.target.value)}
                              className="w-8 text-center text-xs bg-transparent outline-none px-1" />
                          </td>
                          <td className="border border-border p-0.5">
                            <input value={s.name} onChange={(e) => updateSt(s.id, 'name', e.target.value)}
                              placeholder="Full name"
                              className="min-w-45 w-full text-xs bg-transparent outline-none px-1 focus:bg-blue-50 dark:focus:bg-blue-950/30" />
                          </td>
                          <td className="border border-border p-0.5">
                            <input value={s.matno} onChange={(e) => updateSt(s.id, 'matno', e.target.value)}
                              placeholder="Matric No"
                              className="min-w-22.5 w-full text-xs bg-transparent outline-none px-1 focus:bg-blue-50 dark:focus:bg-blue-950/30" />
                          </td>
                          <td className="border border-border p-0.5">
                            <input value={s.ca} onChange={(e) => updateSt(s.id, 'ca', e.target.value)}
                              disabled={s.abs} placeholder="CA"
                              className="w-10 text-center text-xs bg-transparent outline-none px-1 disabled:opacity-40" />
                          </td>
                          <td className="border border-border p-0.5">
                            <input value={s.exam} onChange={(e) => updateSt(s.id, 'exam', e.target.value)}
                              disabled={s.abs} placeholder="Exam"
                              className="w-12 text-center text-xs bg-transparent outline-none px-1 disabled:opacity-40" />
                          </td>
                          <td className="border border-border p-0.5 text-center">
                            <input type="checkbox" checked={s.abs}
                              onChange={(e) => updateSt(s.id, 'abs', e.target.checked)} />
                          </td>
                          <td className={cn('border border-border p-0.5 text-center text-xs bg-muted/20', fail && 'text-red-600 dark:text-red-400')}>
                            {total !== null ? total : ''}
                          </td>
                          <td className={cn('border border-border p-0.5 text-center text-xs bg-muted/20', fail && 'text-red-600 dark:text-red-400')}>
                            {grade}
                          </td>
                          <td className="border border-border p-0.5 text-center">
                            <button type="button" onClick={() => removeStudent(s.id)}
                              className="h-5 w-5 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 text-xs inline-flex items-center justify-center">
                              ×
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={addStudent}
                className="mt-3 px-4 py-1.5 border border-dashed border-border rounded-lg text-xs text-muted-foreground hover:bg-muted/30 transition-colors">
                + Add Student
              </button>
            </>
          )}

          {inputTab === 'paste' && (
            <>
              <p className="text-xs text-muted-foreground mb-2">
                Paste tab-separated rows: <strong>S/N, Name, Mat No, CA, Exam Score</strong>.
                One row per student. Type <strong>ABS</strong> for absent students.
              </p>
              <textarea
                className="w-full font-mono text-xs border border-input rounded-lg p-2 bg-background text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                rows={10}
                value={pasteRaw}
                onChange={(e) => setPasteRaw(e.target.value)}
                placeholder={'1\tJOHN DOE\t23040100103\t35\t55\n2\tJANE SMITH\t23040100001\tABS\t'}
              />
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm px-4 py-2.5 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3 pb-8">
          <Button variant="primary" onClick={generate}>
            Generate Mark Sheet
          </Button>
          {result && (
            <Button variant="outline" onClick={() => setResult(null)}>
              Clear Preview
            </Button>
          )}
        </div>
      </div>

      {/* ── A4 Preview ─────────────────────────────────────────────── */}
      {result && (
        <div id="ms-preview">
          <div className="ms-no-print flex flex-wrap items-center gap-3 px-6 py-3 border-t border-b border-border bg-muted/20 sticky top-0 z-10">
            <Button variant="primary" size="sm" onClick={handlePrint}>
              🖨 Print / Save as PDF
            </Button>
            <Button variant="outline" size="sm" onClick={() => setResult(null)}>
              ✕ Close Preview
            </Button>
            <button type="button"
              onClick={() => setColoured((c) => !c)}
              className={cn(
                'px-3 py-1 text-xs rounded-lg border transition-colors',
                coloured
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-card border-border text-muted-foreground hover:bg-muted',
              )}>
              {coloured ? 'BG: On' : 'BG: Off'}
            </button>
            <span className="text-xs text-muted-foreground">
              Print tip: Layout → <strong>Portrait</strong> · A pop-up will open — allow it if blocked
            </span>
          </div>
          <div className="py-6 px-4 bg-muted/20 overflow-x-auto">
            <MarkSheetDoc form={result.form} students={result.students} coloured={coloured} logoUrl={result.logoUrl} customBands={result.customBands} />
          </div>
        </div>
      )}
    </>
  )
}

// ── A4 Document renderer ───────────────────────────────────────────────────────

function MarkSheetDoc({
  form, students, coloured, logoUrl, customBands,
}: { form: FormState; students: StudentRow[]; coloured: boolean; logoUrl: string | null; customBands: GradeBand[] }) {
  const passmark    = parseInt(form.passmark) || GRADE_SCALES[form.institutionType].defaultPass
  const instType    = form.institutionType
  const isPolyStyle = instType === 'POLYTECHNIC' || instType === 'MONOTECHNIC' || instType === 'VOCATIONAL_INSTITUTION'
  const sorted      = sortedBands(customBands)

  const computedRows: ComputedRow[] = students.map((s, i) => {
    const caNum   = s.ca   !== '' ? Number(s.ca)   : null
    const examNum = s.abs  ? null : (s.exam !== '' ? Number(s.exam) : null)
    const total   = s.abs  ? null : (caNum !== null && examNum !== null ? caNum + examNum : null)
    const grade   = s.abs  ? 'ABS' : (total !== null ? getGrade(total, customBands, passmark) : '')
    return { ...s, sn: s.sn || String(i + 1), caNum, examNum, total, grade }
  })

  const pages       = paginateStudents(computedRows)
  const totalPages  = pages.length

  // Build grade counts from custom bands
  const gradeCounts: Record<string, number> = { ABS: 0 }
  sorted.forEach((b) => { gradeCounts[b.grade] = 0 })
  computedRows.forEach((r) => {
    if (r.abs) gradeCounts.ABS++
    else if (r.total !== null) {
      const g = getGrade(r.total, customBands, passmark)
      gradeCounts[g] = (gradeCounts[g] ?? 0) + 1
    }
  })
  const totalCount = Object.values(gradeCounts).reduce((a, b) => a + b, 0)
  const pct = (n: number) => totalCount > 0 ? Math.round((n / totalCount) * 100) : 0

  return (
    <div className={`ms-pages-wrap${coloured ? '' : ' plain'}`}>
      {pages.map((pageRows, pi) => {
        const isFirst      = pi === 0
        const isLast       = pi === totalPages - 1
        const rowsPerPage  = isFirst ? ROWS_PAGE1 : ROWS_REST
        const padded: (ComputedRow | null)[] = [...pageRows]
        while (padded.length < rowsPerPage) padded.push(null)

        return (
          <div key={pi} className="ms-a4">

            {isFirst ? (
              <>
                <div className="ms-pg-bar first-page">
                  <span>Page {pi + 1} of {totalPages}</span>
                </div>
                <div className="ms-header">
                  {logoUrl && (
                    <img src={logoUrl} alt="Institution logo"
                      style={{ width: 52, height: 52, objectFit: 'contain', display: 'block', margin: '0 auto 4px' }} />
                  )}
                  <div className="ms-uni-name">{form.universityName || 'University Name'}</div>
                  {form.motto && (
                    <div style={{ fontStyle: 'italic', fontSize: '9pt', color: '#333', marginBottom: 2 }}>
                      ...{form.motto}
                    </div>
                  )}
                  <div className="ms-sheet-title">MARKS SHEET</div>
                  <div className="ms-subtitle">
                    {isPolyStyle
                      ? '(To be completed in quadruplicate. Original to be sent to Academic Affairs)'
                      : '(To be completed in quadruplicate. Original to be sent to Exams & Records Units)'}
                  </div>
                </div>
              </>
            ) : (
              <div className="ms-cont-bar">
                <span>MARKS SHEET (Contd.)</span>
                <span className="ms-cont-pg">Page {pi + 1} of {totalPages}</span>
              </div>
            )}

            {/* Course info grid */}
            <table className="ms-info-table" style={{ tableLayout: 'auto' }}>
              <tbody>
                <tr>
                  <td className="ms-info-label">COURSE TITLE</td>
                  <td colSpan={3}>{form.courseTitle}</td>
                  <td className="ms-info-label">COURSE CODE</td>
                  <td style={{ width: 150 }}>{form.courseCode}</td>
                  <td className="ms-info-label">UNITS</td>
                  <td style={{ width: 50 }}>{form.units}</td>
                </tr>
                <tr>
                  <td className="ms-info-label">HOST COLLEGE</td>
                  <td style={{ width: 140 }}>{form.hostCollege}</td>
                  <td className="ms-info-label">HOST DEPT</td>
                  <td colSpan={2} style={{ width: 180 }}>{form.hostDept}</td>
                  <td className="ms-info-label">SERVED DEPT</td>
                  <td colSpan={2}>{form.servedDept}</td>
                </tr>
                <tr>
                  <td className="ms-info-label">SEMESTER</td>
                  <td>{form.semester}</td>
                  <td className="ms-info-label">SESSION</td>
                  <td>{form.session}</td>
                  <td className="ms-info-label">EXAM DATE</td>
                  <td style={{ width: 160 }}>{form.examDate}</td>
                  <td className="ms-info-label">MIN PASS MARK</td>
                  <td style={{ width: 50 }}>{passmark}</td>
                </tr>
              </tbody>
            </table>

            {/* Student table */}
            <table className="ms-main-table">
              <colgroup>
                <col style={{ width: '7mm' }} />
                <col />
                <col style={{ width: '28mm' }} />
                <col style={{ width: '13mm' }} />
                <col style={{ width: '19mm' }} />
                <col style={{ width: '16mm' }} />
                <col style={{ width: '13mm' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>S/N</th>
                  <th style={{ textAlign: 'left', paddingLeft: 3 }}>NAME OF STUDENT</th>
                  <th>MAT NO.</th>
                  <th>CA</th>
                  <th>EXAM<br />SCORE</th>
                  <th>TOTAL</th>
                  <th>GRADE</th>
                </tr>
              </thead>
              <tbody>
                {padded.map((r, i) => {
                  const even   = i % 2 === 1
                  const fail   = r && (r.grade === 'F' || r.grade === 'ABS')
                  const rowBg  = coloured && even ? (fail ? '#FFF5F5' : '#F5F8FF') : undefined
                  if (!r) return (
                    <tr key={`e${i}`} style={rowBg ? { background: rowBg } : {}}>
                      <td /><td /><td /><td /><td /><td /><td />
                    </tr>
                  )
                  return (
                    <tr key={r.id} style={rowBg ? { background: rowBg } : {}}>
                      <td>{r.sn}</td>
                      <td className="ms-name-td">{r.name}</td>
                      <td>{r.matno}</td>
                      <td>{r.abs ? (r.caNum !== null ? r.caNum : '-') : (r.caNum !== null ? r.caNum : '')}</td>
                      <td>{r.examAbs ? 'ABS' : r.abs ? '-' : (r.examNum !== null ? r.examNum : '')}</td>
                      <td className={fail ? 'ms-fail-cell' : ''}>{r.abs ? '-' : (r.total !== null ? r.total : '')}</td>
                      <td className={fail ? 'ms-fail-cell' : ''}>{r.grade}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Signatures + Summary — last page only */}
            {isLast && (
              <>
                <table className="ms-sig-table">
                  <thead>
                    <tr>
                      <th style={{ width: '15%' }} />
                      <th style={{ width: '35%' }}>NAME</th>
                      <th style={{ width: '30%' }}>SIGNATURE</th>
                      <th style={{ width: '20%' }}>DATE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {([['LECTURER', form.lecturer], ['H.O.D', form.hod], ['DEAN', form.dean]] as const).map(([role, name]) => (
                      <tr key={role}>
                        <td className="ms-role-td">{role}</td>
                        <td>{name}</td><td /><td />
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="ms-summary-area">
                  {(() => {
                    const half = Math.ceil(sorted.length / 2)
                    const col1 = sorted.slice(0, half)
                    const col2 = sorted.slice(half)
                    return (
                      <>
                        <table className="ms-summary-table">
                          <tbody>
                            <tr><td colSpan={4} className="ms-summary-hdr">SUMMARY</td></tr>
                            <tr>
                              <td className="ms-summary-col-hdr">SCORE</td>
                              <td className="ms-summary-col-hdr">GRADE</td>
                              <td className="ms-summary-col-hdr">NO.</td>
                              <td className="ms-summary-col-hdr">%</td>
                            </tr>
                            {col1.map((b, i) => (
                              <tr key={b.grade}>
                                <td>{bandLabel(sorted, i)}</td>
                                <td>{b.grade}</td>
                                <td>{gradeCounts[b.grade] ?? 0}</td>
                                <td>{pct(gradeCounts[b.grade] ?? 0)}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <table className="ms-summary-table">
                          <tbody>
                            {col2.map((b, i) => (
                              <tr key={b.grade}>
                                <td>{bandLabel(sorted, half + i)}</td>
                                <td>{b.grade}</td>
                                <td>{gradeCounts[b.grade] ?? 0}</td>
                                <td>{pct(gradeCounts[b.grade] ?? 0)}%</td>
                              </tr>
                            ))}
                            <tr>
                              <td colSpan={2} className="ms-absent-cell">ABSENT</td>
                              <td>{gradeCounts.ABS}</td>
                              <td>{pct(gradeCounts.ABS)}%</td>
                            </tr>
                            <tr>
                              <td colSpan={2} className="ms-total-cell">TOTAL</td>
                              <td>{totalCount}</td>
                              <td>{totalCount > 0 ? '100%' : ''}</td>
                            </tr>
                          </tbody>
                        </table>
                      </>
                    )
                  })()}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
