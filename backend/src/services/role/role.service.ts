import { prisma } from '../../config/database'
import { P } from '../../middleware/rbac.middleware'

// ── Permission definitions ────────────────────────────────────────────────────
const ALL_PERMISSIONS: { code: string; resource: string; action: string; description: string }[] = [
  { code: P.COURSES_CREATE,    resource: 'courses',      action: 'create',       description: 'Create courses' },
  { code: P.COURSES_READ,      resource: 'courses',      action: 'read',         description: 'View courses' },
  { code: P.COURSES_UPDATE,    resource: 'courses',      action: 'update',       description: 'Edit courses' },
  { code: P.COURSES_DELETE,    resource: 'courses',      action: 'delete',       description: 'Delete courses' },
  { code: P.COURSES_MANAGE,    resource: 'courses',      action: 'manage',       description: 'Full course management' },
  { code: P.DOCS_CREATE,       resource: 'documents',    action: 'create',       description: 'Create documents' },
  { code: P.DOCS_READ,         resource: 'documents',    action: 'read',         description: 'View documents' },
  { code: P.DOCS_UPDATE,       resource: 'documents',    action: 'update',       description: 'Edit documents' },
  { code: P.DOCS_DELETE,       resource: 'documents',    action: 'delete',       description: 'Delete documents' },
  { code: P.DOCS_APPROVE,      resource: 'documents',    action: 'approve',      description: 'Approve documents' },
  { code: P.AI_GENERATE,       resource: 'ai',           action: 'generate',     description: 'Use AI generation' },
  { code: P.AI_CONFIGURE,      resource: 'ai',           action: 'configure',    description: 'Configure AI providers' },
  { code: P.AI_VIEW_USAGE,     resource: 'ai',           action: 'view_usage',   description: 'View AI usage stats' },
  { code: P.USERS_CREATE,      resource: 'users',        action: 'create',       description: 'Create users' },
  { code: P.USERS_READ,        resource: 'users',        action: 'read',         description: 'View users' },
  { code: P.USERS_UPDATE,      resource: 'users',        action: 'update',       description: 'Edit users' },
  { code: P.USERS_DELETE,      resource: 'users',        action: 'delete',       description: 'Delete users' },
  { code: P.USERS_INVITE,      resource: 'users',        action: 'invite',       description: 'Invite users' },
  { code: P.USERS_MANAGE_ROLES,resource: 'users',        action: 'manage_roles', description: 'Assign user roles' },
  { code: P.INSTITUTION_READ,  resource: 'institution',  action: 'read',         description: 'View institution settings' },
  { code: P.INSTITUTION_UPDATE,resource: 'institution',  action: 'update',       description: 'Edit institution settings' },
  { code: P.BILLING_READ,      resource: 'billing',      action: 'read',         description: 'View billing information' },
  { code: P.BILLING_MANAGE,    resource: 'billing',      action: 'manage',       description: 'Manage billing & subscription' },
  { code: P.TEMPLATES_CREATE,  resource: 'templates',    action: 'create',       description: 'Create templates' },
  { code: P.TEMPLATES_READ,    resource: 'templates',    action: 'read',         description: 'View templates' },
  { code: P.TEMPLATES_UPDATE,  resource: 'templates',    action: 'update',       description: 'Edit templates' },
  { code: P.TEMPLATES_DELETE,  resource: 'templates',    action: 'delete',       description: 'Delete templates' },
  { code: P.EXPORTS_CREATE,    resource: 'exports',      action: 'create',       description: 'Export documents' },
  { code: P.EXPORTS_READ,      resource: 'exports',      action: 'read',         description: 'View exports' },
  { code: P.ANALYTICS_READ,    resource: 'analytics',    action: 'read',         description: 'View analytics' },
  { code: P.ANALYTICS_EXPORT,  resource: 'analytics',    action: 'export',       description: 'Export analytics data' },
  { code: P.AUDIT_READ,        resource: 'audit',        action: 'read',         description: 'View audit logs' },
  { code: P.SETTINGS_READ,     resource: 'settings',     action: 'read',         description: 'View settings' },
  { code: P.SETTINGS_UPDATE,   resource: 'settings',     action: 'update',       description: 'Update settings' },
]

const ALL_CODES = ALL_PERMISSIONS.map((p) => p.code)

// ── Role → permission mapping ─────────────────────────────────────────────────
const ROLE_PERM_MAP: Record<string, string[]> = {
  owner:                ALL_CODES,
  admin:                ALL_CODES.filter((c) => c !== P.BILLING_MANAGE),
  dean:                 [P.COURSES_READ, P.COURSES_CREATE, P.COURSES_UPDATE, P.DOCS_READ, P.DOCS_CREATE, P.DOCS_APPROVE, P.AI_GENERATE, P.AI_VIEW_USAGE, P.ANALYTICS_READ, P.EXPORTS_CREATE, P.EXPORTS_READ, P.SETTINGS_READ, P.TEMPLATES_READ, P.USERS_READ],
  head_of_department:   [P.COURSES_READ, P.COURSES_CREATE, P.COURSES_UPDATE, P.DOCS_READ, P.DOCS_CREATE, P.DOCS_UPDATE, P.DOCS_APPROVE, P.AI_GENERATE, P.TEMPLATES_READ, P.TEMPLATES_CREATE, P.EXPORTS_CREATE, P.EXPORTS_READ, P.USERS_READ, P.ANALYTICS_READ],
  programme_coordinator:[P.COURSES_READ, P.COURSES_CREATE, P.COURSES_UPDATE, P.DOCS_READ, P.DOCS_CREATE, P.DOCS_UPDATE, P.AI_GENERATE, P.TEMPLATES_READ, P.EXPORTS_CREATE, P.EXPORTS_READ, P.ANALYTICS_READ],
  lecturer:             [P.COURSES_READ, P.COURSES_CREATE, P.DOCS_READ, P.DOCS_CREATE, P.DOCS_UPDATE, P.AI_GENERATE, P.TEMPLATES_READ, P.EXPORTS_CREATE, P.EXPORTS_READ],
  teaching_assistant:   [P.COURSES_READ, P.DOCS_READ, P.AI_GENERATE, P.EXPORTS_READ],
  instructional_designer:[P.TEMPLATES_CREATE, P.TEMPLATES_READ, P.TEMPLATES_UPDATE, P.DOCS_READ, P.DOCS_CREATE, P.AI_GENERATE, P.EXPORTS_READ],
  quality_assurance:    [P.DOCS_READ, P.DOCS_APPROVE, P.ANALYTICS_READ, P.EXPORTS_READ],
  viewer:               [P.COURSES_READ, P.DOCS_READ, P.TEMPLATES_READ],
}

const DEFAULT_ROLES = [
  { slug: 'owner',                 name: 'Owner',                  description: 'Full control over the institution', isSystem: true },
  { slug: 'admin',                 name: 'Administrator',          description: 'Manages users, roles, and settings', isSystem: true },
  { slug: 'dean',                  name: 'Dean',                   description: 'Faculty-level oversight', isSystem: true },
  { slug: 'head_of_department',    name: 'Head of Department',     description: 'Departmental management', isSystem: true },
  { slug: 'programme_coordinator', name: 'Programme Coordinator',  description: 'Coordinates academic programmes', isSystem: true },
  { slug: 'lecturer',              name: 'Lecturer',               description: 'Teaching staff with content creation', isSystem: true },
  { slug: 'teaching_assistant',    name: 'Teaching Assistant',     description: 'Supports teaching activities', isSystem: true },
  { slug: 'instructional_designer',name: 'Instructional Designer', description: 'Designs learning materials and templates', isSystem: true },
  { slug: 'quality_assurance',     name: 'Quality Assurance',      description: 'Reviews and approves content', isSystem: true },
  { slug: 'viewer',                name: 'Viewer',                 description: 'Read-only access', isSystem: true },
]

export const roleService = {
  /** Ensure all global Permission records exist. Call once on startup. */
  async seedPermissions(): Promise<void> {
    for (const perm of ALL_PERMISSIONS) {
      await prisma.permission.upsert({
        where:  { code: perm.code },
        update: { resource: perm.resource, action: perm.action, description: perm.description },
        create: { code: perm.code, resource: perm.resource, action: perm.action, description: perm.description },
      })
    }
  },

  /** Create default roles for a newly registered institution. */
  async createDefaultRoles(institutionId: string): Promise<void> {
    const allPerms = await prisma.permission.findMany()
    const permByCode = new Map(allPerms.map((p) => [p.code, p.id]))

    for (const role of DEFAULT_ROLES) {
      const codes = ROLE_PERM_MAP[role.slug] ?? []

      const createdRole = await prisma.role.upsert({
        where: { institutionId_slug: { institutionId, slug: role.slug } },
        update: { name: role.name, description: role.description },
        create: {
          institutionId,
          slug:        role.slug,
          name:        role.name,
          description: role.description,
          isSystem:    role.isSystem,
        },
      })

      // Upsert all permission associations
      for (const code of codes) {
        const permId = permByCode.get(code)
        if (!permId) continue
        await prisma.rolePermission.upsert({
          where:  { roleId_permissionId: { roleId: createdRole.id, permissionId: permId } },
          update: {},
          create: { roleId: createdRole.id, permissionId: permId },
        })
      }
    }
  },

  /** Assign a role to a user by slug within an institution. */
  async assignRole(userId: string, institutionId: string, roleSlug: string, grantedById?: string) {
    const role = await prisma.role.findUnique({
      where: { institutionId_slug: { institutionId, slug: roleSlug } },
    })
    if (!role) throw new Error(`Role '${roleSlug}' not found in institution`)

    return prisma.userRoleAssignment.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: { grantedById: grantedById ?? null },
      create: { userId, roleId: role.id, grantedById: grantedById ?? null },
    })
  },

  /** Get user's primary role slug within an institution. */
  async getPrimaryRoleSlug(userId: string, institutionId: string): Promise<string> {
    const ORDER = DEFAULT_ROLES.map((r) => r.slug)

    const assignments = await prisma.userRoleAssignment.findMany({
      where: { userId, role: { institutionId } },
      include: { role: { select: { slug: true } } },
    })

    const slugs = assignments.map((a) => a.role.slug)
    const primary = ORDER.find((s) => slugs.includes(s)) ?? slugs[0] ?? 'viewer'
    return primary
  },

  async listRoles(institutionId: string) {
    return prisma.role.findMany({
      where: { institutionId },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { userAssignments: true } },
      },
      orderBy: { name: 'asc' },
    })
  },

  async listPermissions() {
    return prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] })
  },
}
