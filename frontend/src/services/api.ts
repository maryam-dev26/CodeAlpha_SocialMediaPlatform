import { ApiError } from './ApiError.ts'

const apiBaseUrl = import.meta.env.VITE_API_URL

if (!apiBaseUrl) {
  throw new Error('VITE_API_URL is not configured')
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

async function sendRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers)

  headers.set('Accept', 'application/json')

  if (
    options.body &&
    typeof options.body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }

  
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers,
    })
  } catch {
    throw new ApiError(
      'Network error. Please check your connection and try again.',
      0,
    )
  }

  const data = await parseResponse(response)

  if (!response.ok) {
    const errorData =
      data && typeof data === 'object'
        ? (data as {
            message?: string
            errors?: ApiError['errors']
          })
        : undefined

    const message =
      typeof errorData?.message === 'string'
        ? errorData.message
        : `Request failed with status ${response.status}`

    throw new ApiError(message, response.status, errorData?.errors)
  }

  return data as T
}

  let refreshPromise: Promise<unknown> | null = null

  function refreshAccessToken(): Promise<unknown> {
    if(!refreshPromise) {
      refreshPromise= sendRequest<unknown>('/api/auth/refresh',{
        method: 'POST',
      }).finally(() => {
        refreshPromise = null
      })
    }
    return refreshPromise
  }

  const NO_REFRESH = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/auth/logout',
]

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
) : Promise<T> {
  
  try {
    return await sendRequest<T>(endpoint, options)
  } catch (error) {
    const shouldRefresh =
      error instanceof ApiError &&
      error.status === 401 &&
      !NO_REFRESH.includes(endpoint)

      if (!shouldRefresh) {
        throw error
      }

      await refreshAccessToken()

      return sendRequest<T>(endpoint, options)
  }
}

export { apiRequest }