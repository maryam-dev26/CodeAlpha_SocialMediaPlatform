import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'

type GuestRouteState = {
  from?: { pathname?: string; search?: string; hash?: string }
}

export default function GuestRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <p>Loading...</p>

  const state = location.state as GuestRouteState | null
  const from = state?.from
  const destination = from?.pathname
    ? `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
    : '/'

  return user ? <Navigate to={destination} replace /> : <Outlet />
}