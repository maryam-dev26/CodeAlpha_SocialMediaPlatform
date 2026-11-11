import { ApiError } from './ApiError.ts'

const apiBaseUrl = import.meta.env.VITE_API_URL

if (!apiBaseUrl) {
  throw new Error('VITE_API_URL is not configured')
}

// Read the body as text first, so an empty or non-JSON body never crashes
async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    // Not JSON (for example an HTML error page from a proxy)
    return null
  }
}

async function apiRequest<T>(
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
    // fetch rejects only when the request never reached the server
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

export { apiRequest }