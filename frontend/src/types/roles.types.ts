export const USER_ROLES = [
  'student',
  'lecturer',
  'department_head',
  'dean',
  'university_admin',
  'administrator',
  'teaching_assistant',
] as const

export type UserRole = (typeof USER_ROLES)[number]

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  lecturer: 'Lecturer',
  department_head: 'Department Head',
  dean: 'Dean',
  university_admin: 'University Admin',
  administrator: 'Administrator',
  teaching_assistant: 'Teaching Assistant',
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  student: 0,
  teaching_assistant: 1,
  lecturer: 2,
  department_head: 3,
  dean: 4,
  university_admin: 5,
  administrator: 6,
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}
