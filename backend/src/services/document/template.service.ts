import { prisma } from '../../config/database'
import { AppError } from '../../utils/errors'

export const templateService = {
  async list(institutionId: string | null, category?: string) {
    return prisma.promptTemplate.findMany({
      where: {
        OR: [
          { institutionId },
          { isPublic: true },
          { isDefault: true },
        ],
        ...(category ? { category } : {}),
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      include: { creator: { select: { id: true, name: true, avatarUrl: true } } },
    })
  },

  async get(id: string) {
    const t = await prisma.promptTemplate.findUnique({ where: { id } })
    if (!t) throw AppError.notFound('Template')
    return t
  },

  async create(data: {
    name: string; category: string; prompt: string; systemPrompt?: string
    variables?: unknown[]; isPublic?: boolean; institutionId?: string; createdBy: string
  }) {
    return prisma.promptTemplate.create({ data: { ...data, variables: data.variables as never ?? [] } })
  },

  async update(id: string, userId: string, data: Partial<{
    name: string; category: string; prompt: string; systemPrompt: string
    variables: unknown[]; isPublic: boolean
  }>) {
    const t = await prisma.promptTemplate.findFirst({ where: { id, createdBy: userId } })
    if (!t) throw AppError.notFound('Template')
    if (t.isDefault) throw AppError.forbidden('Cannot edit default templates')

    return prisma.promptTemplate.update({ where: { id }, data: data as never })
  },

  async delete(id: string, userId: string) {
    const t = await prisma.promptTemplate.findFirst({ where: { id, createdBy: userId } })
    if (!t) throw AppError.notFound('Template')
    if (t.isDefault) throw AppError.forbidden('Cannot delete default templates')

    await prisma.promptTemplate.delete({ where: { id } })
  },

  async seedDefaults(institutionId: string, createdBy: string) {
    const defaults = [
      {
        name: 'Standard Lecture Notes', category: 'lecture-notes', isDefault: true, isPublic: true,
        prompt: 'Generate comprehensive lecture notes for ${topic} at ${level} level covering ${duration} minutes.',
        systemPrompt: 'You are an expert academic lecturer. Produce structured, academically rigorous lecture notes.',
        variables: [{ name: 'topic', type: 'text', required: true }, { name: 'level', type: 'select', required: true }, { name: 'duration', type: 'number', default: 90 }],
      },
      {
        name: 'MCQ Quiz', category: 'quiz', isDefault: true, isPublic: true,
        prompt: 'Generate ${count} multiple choice questions on ${topic} at ${level} level with ${difficulty} difficulty.',
        systemPrompt: 'You are an expert academic assessment designer. Create clear, unambiguous MCQ questions.',
        variables: [{ name: 'topic', type: 'text', required: true }, { name: 'count', type: 'number', default: 20 }, { name: 'difficulty', type: 'select', options: ['EASY', 'MEDIUM', 'HARD'] }],
      },
      {
        name: 'Course Outline Template', category: 'course-outline', isDefault: true, isPublic: true,
        prompt: 'Generate a complete NUC-compliant course outline for ${courseTitle} (${courseCode}) at ${level} level for ${weeks} weeks.',
        systemPrompt: 'You are an expert curriculum developer. Produce complete, NUC-compliant course outlines.',
        variables: [{ name: 'courseTitle', type: 'text', required: true }, { name: 'courseCode', type: 'text' }, { name: 'weeks', type: 'number', default: 15 }],
      },
    ]

    for (const def of defaults) {
      await prisma.promptTemplate.upsert({
        where: { id: `default-${def.category}-${institutionId}` },
        update: {},
        create: { id: `default-${def.category}-${institutionId}`, institutionId, createdBy, ...def, variables: def.variables as never },
      })
    }
  },
}
