import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'
import type { RedirectFrom } from '../types/routing.ts'
import { getSafeDestination } from '../utils/redirect.ts'

type GuestRouteState = { from?: RedirectFrom } | null

export default function GuestRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <p>Loading...</p>

  if (user) {
    const state = location.state as GuestRouteState
    return <Navigate to={getSafeDestination(state?.from)} replace />
  }

  return <Outlet />
}