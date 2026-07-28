import type { InstitutionType } from '@/features/settings/pages/InstitutionSettingsPage'

export interface GradeBand { min: number; grade: string; gp?: number }

export const GRADE_SCALES: Record<InstitutionType, { bands: GradeBand[]; defaultPass: number }> = {
  UNIVERSITY: {
    defaultPass: 40,
    bands: [
      { min: 70, grade: 'A', gp: 5.0 },
      { min: 60, grade: 'B', gp: 4.0 },
      { min: 50, grade: 'C', gp: 3.0 },
      { min: 45, grade: 'D', gp: 2.0 },
      { min: 40, grade: 'E', gp: 1.0 },
      { min:  0, grade: 'F', gp: 0.0 },
    ],
  },
  POLYTECHNIC: {
    defaultPass: 40,
    bands: [
      { min: 75, grade: 'A',  gp: 4.0 },
      { min: 70, grade: 'AB', gp: 3.5 },
      { min: 65, grade: 'B',  gp: 3.25 },
      { min: 60, grade: 'BC', gp: 3.0 },
      { min: 55, grade: 'C',  gp: 2.75 },
      { min: 50, grade: 'CD', gp: 2.5 },
      { min: 45, grade: 'D',  gp: 2.25 },
      { min: 40, grade: 'E',  gp: 2.0 },
      { min:  0, grade: 'F',  gp: 0.0 },
    ],
  },
  MONOTECHNIC: {
    defaultPass: 50,
    bands: [
      { min: 75, grade: 'D'  },
      { min: 65, grade: 'UC' },
      { min: 55, grade: 'LC' },
      { min: 50, grade: 'P'  },
      { min:  0, grade: 'F'  },
    ],
  },
  COLLEGE_OF_EDUCATION: {
    defaultPass: 45,
    bands: [
      { min: 70, grade: 'A', gp: 4.0 },
      { min: 60, grade: 'B', gp: 3.0 },
      { min: 50, grade: 'C', gp: 2.0 },
      { min: 45, grade: 'D', gp: 1.0 },
      { min:  0, grade: 'F', gp: 0.0 },
    ],
  },
  VOCATIONAL_INSTITUTION: {
    defaultPass: 50,
    bands: [
      { min: 75, grade: 'D'  },
      { min: 65, grade: 'UC' },
      { min: 55, grade: 'LC' },
      { min: 50, grade: 'P'  },
      { min:  0, grade: 'F'  },
    ],
  },
  OTHER: {
    defaultPass: 40,
    bands: [
      { min: 70, grade: 'A', gp: 5.0 },
      { min: 60, grade: 'B', gp: 4.0 },
      { min: 50, grade: 'C', gp: 3.0 },
      { min: 45, grade: 'D', gp: 2.0 },
      { min: 40, grade: 'E', gp: 1.0 },
      { min:  0, grade: 'F', gp: 0.0 },
    ],
  },
}

export const INSTITUTION_TYPE_OPTIONS: { value: InstitutionType; label: string }[] = [
  { value: 'UNIVERSITY',             label: 'University' },
  { value: 'POLYTECHNIC',            label: 'Polytechnic' },
  { value: 'COLLEGE_OF_EDUCATION',   label: 'College of Education' },
  { value: 'MONOTECHNIC',            label: 'Monotechnic' },
  { value: 'VOCATIONAL_INSTITUTION', label: 'Vocational Institution' },
  { value: 'OTHER',                  label: 'Other' },
]

export function sortedBands(bands: GradeBand[]): GradeBand[] {
  return [...bands].sort((a, b) => b.min - a.min)
}

export function bandLabel(sorted: GradeBand[], i: number): string {
  const max = i === 0 ? 100 : sorted[i - 1].min - 1
  return `${sorted[i].min}–${max}`
}

export function getGrade(total: number, bands: GradeBand[], passmark: number): string {
  if (total < passmark) return 'F'
  const s = sortedBands(bands)
  for (const band of s) {
    if (total >= band.min) return band.grade
  }
  return 'F'
}

const GRADE_BANDS_KEY = 'lecturecraft-grade-scales'

export function loadCustomBands(instType: InstitutionType): GradeBand[] {
  try {
    const stored = localStorage.getItem(GRADE_BANDS_KEY)
    if (stored) {
      const all = JSON.parse(stored) as Partial<Record<InstitutionType, GradeBand[]>>
      if (all[instType]?.length) return all[instType]!.map((b) => ({ ...b }))
    }
  } catch { /* ignore */ }
  return GRADE_SCALES[instType].bands.map((b) => ({ ...b }))
}

export function saveCustomBands(instType: InstitutionType, bands: GradeBand[]) {
  try {
    const stored = localStorage.getItem(GRADE_BANDS_KEY)
    const all: Partial<Record<InstitutionType, GradeBand[]>> = stored ? (JSON.parse(stored) as Partial<Record<InstitutionType, GradeBand[]>>) : {}
    all[instType] = bands
    localStorage.setItem(GRADE_BANDS_KEY, JSON.stringify(all))
  } catch { /* ignore */ }
}
