import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

import app from '../src/app.js'
import { resetRateLimiters } from '../src/middleware/rateLimiters.js'

let server
let baseUrl

const allowedOrigin = 'http://localhost:5173'

const request = (
  path,
  { method = 'GET', body, origin = allowedOrigin } = {},
) => {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (origin) {
    headers.Origin = origin
  }

  return fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const invalidLogin = () =>
  request('/api/auth/login', { method: 'POST', body: {} })

const invalidRegistration = () =>
  request('/api/auth/register', { method: 'POST', body: {} })

const refreshWithoutToken = () =>
  request('/api/auth/refresh', { method: 'POST' })

const assertRateLimited = async (response, limit) => {
  assert.equal(response.status, 429)
  assert.deepEqual(await response.json(), {
    message: 'Too many requests. Please try again later.',
  })
  assert.equal(response.headers.get('ratelimit-limit'), String(limit))
  assert.ok(response.headers.get('ratelimit-policy'))
  assert.equal(response.headers.get('ratelimit-remaining'), '0')
  assert.ok(response.headers.get('ratelimit-reset'))
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
}

before(async () => {
  server = app.listen(0, '127.0.0.1')
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  baseUrl = `http://127.0.0.1:${server.address().port}`
})

beforeEach(() => {
  resetRateLimiters()
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

test('allows login requests below the configured limit', async () => {
  for (let index = 0; index < 10; index += 1) {
    const response = await invalidLogin()

    assert.equal(response.status, 400)
  }
})

test('returns a JSON 429 with standard headers after the login limit is exceeded', async () => {
  for (let index = 0; index < 10; index += 1) {
    const response = await invalidLogin()

    assert.equal(response.status, 400)
  }

  await assertRateLimited(await invalidLogin(), 10)
})

test('allows registration requests below the configured limit', async () => {
  for (let index = 0; index < 5; index += 1) {
    const response = await invalidRegistration()

    assert.equal(response.status, 400)
  }
})

test('returns a JSON 429 with standard headers after the registration limit is exceeded', async () => {
  for (let index = 0; index < 5; index += 1) {
    const response = await invalidRegistration()

    assert.equal(response.status, 400)
  }

  await assertRateLimited(await invalidRegistration(), 5)
})

test('allows refresh requests below the configured limit', async () => {
  for (let index = 0; index < 30; index += 1) {
    const response = await refreshWithoutToken()

    assert.equal(response.status, 401)
  }
})

test('returns a JSON 429 with standard headers after the refresh limit is exceeded', async () => {
  for (let index = 0; index < 30; index += 1) {
    const response = await refreshWithoutToken()

    assert.equal(response.status, 401)
  }

  await assertRateLimited(await refreshWithoutToken(), 30)
})

test('does not apply rate limiters to /me or /logout', async () => {
  for (let index = 0; index < 10; index += 1) {
    await invalidLogin()
  }

  for (let index = 0; index < 5; index += 1) {
    await invalidRegistration()
  }

  for (let index = 0; index < 30; index += 1) {
    await refreshWithoutToken()
  }

  const meResponse = await request('/api/auth/me')

  assert.equal(meResponse.status, 401)

  const logoutResponse = await request('/api/auth/logout', { method: 'POST' })

  assert.equal(logoutResponse.status, 200)
  assert.deepEqual(await logoutResponse.json(), {
    message: 'Logged out successfully',
  })
})

test('keeps Origin validation ahead of rate limiting', async () => {
  const response = await request('/api/auth/login', {
    method: 'POST',
    body: {},
    origin: 'https://evil.example',
  })

  assert.equal(response.status, 403)
  assert.deepEqual(await response.json(), {
    message: 'Request origin is not allowed',
  })
})

test('does not interfere with CORS preflight requests', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: allowedOrigin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })

  assert.equal(response.status, 204)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    allowedOrigin,
  )
})
