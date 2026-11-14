import { useEffect } from 'react'
import { login } from './services/authService.ts'
import { ApiError } from './services/ApiError.ts'

function logResult(label: string, error: unknown) {
  if (error instanceof ApiError) {
    console.log(label, '->', error.name, error.status, error.message, error.errors)
  } else {
    console.log(label, '-> NOT an ApiError:', error)
  }
}

function App() {
  useEffect(() => {
    // Test 1: wrong credentials, expect ApiError 401 "Invalid email or password"
    login({ email: 'nobody@example.com', password: 'wrongpass123' })
      .then((data) => console.log('Test 1 unexpected success:', data))
      .catch((error) => logResult('Test 1 (wrong credentials)', error))

    // Test 2: invalid input, expect ApiError 400 "Validation failed" with an errors array
    login({ email: 'not-an-email', password: 'short' })
      .then((data) => console.log('Test 2 unexpected success:', data))
      .catch((error) => logResult('Test 2 (validation)', error))
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">Vynkverse</h1>
        <p className="mt-2 text-slate-400">
          A developer learning and peer-support community
        </p>
      </div>
    </main>
  )
}

export default App
