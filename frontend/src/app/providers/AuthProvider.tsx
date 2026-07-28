import {
  createContext, useContext, useEffect, useState, useCallback, type ReactNode,
} from 'react'
import { authApi, type AuthUser, type AuthInstitution } from '@/lib/api/auth.api'

interface AuthContextValue {
  user: AuthUser | null
  institution: AuthInstitution | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<Pick<AuthUser, 'name' | 'firstName' | 'lastName' | 'department' | 'faculty' | 'title' | 'bio'>>) => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const ACCESS_KEY  = 'accessToken'
const REFRESH_KEY = 'refreshToken'

function saveTokens(access: string, refresh?: string) {
  localStorage.setItem(ACCESS_KEY, access)
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
}
function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}
export function getToken() { return localStorage.getItem(ACCESS_KEY) }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,        setUser]        = useState<AuthUser | null>(null)
  const [institution, setInstitution] = useState<AuthInstitution | null>(null)
  const [isLoading,   setIsLoading]   = useState(true)

  async function hydrateUser() {
    try {
      const { user: u, institution: inst } = await authApi.me()
      setUser(u)
      setInstitution(inst)
    } catch {
      clearTokens()
      setUser(null)
      setInstitution(null)
    }
  }

  // On mount: if we have a stored access token, validate it
  useEffect(() => {
    const token = getToken()
    if (!token) { setIsLoading(false); return }
    hydrateUser().finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, tokens, institution: inst } = await authApi.login({ email, password })
    saveTokens(tokens.accessToken, tokens.refreshToken)
    setUser(u)
    setInstitution(inst)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {})
    clearTokens()
    setUser(null)
    setInstitution(null)
  }, [])

  const updateProfile = useCallback(async (data: Parameters<AuthContextValue['updateProfile']>[0]) => {
    const { user: updated } = await authApi.updateProfile(data as Parameters<typeof authApi.updateProfile>[0])
    setUser(updated)
  }, [])

  const refreshUser = useCallback(async () => {
    await hydrateUser()
  }, [])

  return (
    <AuthContext value={{ user, institution, isLoading, isAuthenticated: !!user, login, logout, updateProfile, refreshUser }}>
      {children}
    </AuthContext>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
