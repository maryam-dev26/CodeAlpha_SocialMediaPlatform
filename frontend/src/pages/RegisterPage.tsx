import { useState, type SyntheticEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import FormField from '../components/common/FormField.tsx'
import { useAuth } from '../hooks/useAuth.ts'
import { parseApiError } from '../utils/formErrors.ts'
import type { RedirectFrom } from '../types/routing.ts'

type RegisterRouteState = {
  from?: RedirectFrom
}

export default function RegisterPage() {
  const { register } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const routeState = location.state as RegisterRouteState | null

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isSubmitting) return

    setFormError('')
    setFieldErrors({})
    setIsSubmitting(true)

    try {
      await register({ name, username, email, password })

      navigate('/login', {
        state: {
          registered: true,
          ...(routeState?.from ? { from: routeState.from } : {}),
        },
      })
    } catch (error) {
      const parsed = parseApiError(error)
      setFormError(parsed.message)
      setFieldErrors(parsed.fields)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-slate-900">Create an account</h1>

        {formError ? (
          <p
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          >
            {formError}
          </p>
        ) : null}

        <FormField
          id="register-name"
          label="Name"
          autoComplete="name"
          value={name}
          onChange={setName}
          error={fieldErrors.name}
        />

        <FormField
          id="register-username"
          label="Username"
          autoComplete="username"
          value={username}
          onChange={setUsername}
          error={fieldErrors.username}
        />

        <FormField
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          error={fieldErrors.email}
        />

        <FormField
          id="register-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={fieldErrors.password}
        />

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link
            to="/login"
            state={routeState?.from ? { from: routeState.from } : null}
            className="font-medium text-teal-700 hover:underline"
          >
            Log in
          </Link>
        </p>
      </form>
    </div>
  )
}
