export interface ApiResponse<T> {
  data: T | null
  error: string | null
  status: 'success' | 'error'
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface SelectOption {
  value: string
  label: string
  description?: string
  icon?: string
  disabled?: boolean
}

export interface FileUpload {
  id: string
  name: string
  size: number
  type: string
  url: string
  uploadedAt: string
}
