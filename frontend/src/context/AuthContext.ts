import { createContext } from 'react'
import type { LoginCredentials, RegisterCredentials } from '../types/auth.ts'
import type { User } from '../types/user.ts'

export interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)