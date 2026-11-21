import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth.ts'
import { parseApiError } from '../utils/formErrors.ts'

export default function AppLayout() {
  const { user, isLoading, logout } = useAuth()
  const navigate = useNavigate()

  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const handleLogout = async () => {
    if (isLoggingOut) {
      return
    }

    setLogoutError('')
    setIsLoggingOut(true)

    try {
      await logout()
      navigate('/', { replace: true })
    } catch (error) {
      setLogoutError(parseApiError(error).message)
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight text-teal-700">
            Vynkverse
          </Link>

          <nav aria-label="Main navigation" className="flex items-center gap-2">
            {isLoading ? null : user ? (
              <>
                <Link
                  to="/profile"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? 'Logging out…' : 'Logout'}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>

        {logoutError ? (
          <p
            role="alert"
            className="border-t border-red-200 bg-red-50 px-4 py-2 text-center text-sm text-red-800"
          >
            {logoutError}
          </p>
        ) : null}
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}