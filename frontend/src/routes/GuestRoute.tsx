import { Navigate, Outlet } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'

export default function GuestRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) return <p>Loading...</p>

  return user ? <Navigate to="/" replace /> : <Outlet />
}