import { useEffect, useState, type ReactNode } from 'react'
import type { LoginCredentials, RegisterCredentials } from '../types/auth.ts'
import type { User } from '../types/user.ts'
import * as authService from '../services/authService.ts'
import { ApiError } from '../services/ApiError.ts'
import { AuthContext } from './AuthContext.tsx'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadUser = async () => {
      try {
        const response = await authService.getCurrentUser()
        if (!cancelled) setUser(response.user)
      } catch (error) {
        if (cancelled) return

        setUser(null)
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error('Failed to load the current user', error)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void loadUser()

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (credentials: LoginCredentials) => {
    const response = await authService.login(credentials)
    setUser(response.user)
  }

  const register = async (credentials: RegisterCredentials) => {
    await authService.register(credentials)
  }

  const logout = async () => {
    await authService.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
