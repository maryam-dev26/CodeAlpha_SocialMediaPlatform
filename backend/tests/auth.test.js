import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../src/app.js'
import RefreshToken from '../src/models/RefreshToken.js'
import User from '../src/models/User.js'
import { resetRateLimiters } from '../src/middleware/rateLimiters.js'
import { comparePassword } from '../src/utils/password.js'
import { hashToken } from '../src/utils/tokens.js'

let mongoServer
let server
let baseUrl

const cookies = new Map()
const allowedOrigin = 'http://localhost:5173'

const validUser = (overrides = {}) => ({
  name: 'Maryam Khan',
  username: 'maryam_k',
  email: 'maryam@example.com',
  password: 'strongpass123',
  ...overrides,
})

const resetCookies = () => cookies.clear()

const cookieHeader = () =>
  [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; ')

const storeCookies = (setCookieHeaders) => {
  for (const header of setCookieHeaders) {
    const [pair] = header.split(';')
    const separator = pair.indexOf('=')
    const name = pair.slice(0, separator)
    const value = pair.slice(separator + 1)

    if (value === '') {
      cookies.delete(name)
    } else {
      cookies.set(name, value)
    }
  }
}

const api = async (
  path,
  {
    method = 'GET',
    body,
    cookie,
    useCookies = true,
    origin = method === 'GET' ? undefined : allowedOrigin,
  } = {},
) => {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (origin) {
    headers.Origin = origin
  }

  const cookieValue = cookie ?? (useCookies ? cookieHeader() : '')

  if (cookieValue) {
    headers.Cookie = cookieValue
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const setCookieHeaders = response.headers.getSetCookie()
  storeCookies(setCookieHeaders)

  const text = await response.text()

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    setCookieHeaders,
  }
}

const registerUser = (overrides) =>
  api('/api/auth/register', { method: 'POST', body: validUser(overrides) })

const loginUser = (overrides) =>
  api('/api/auth/login', {
    method: 'POST',
    body: { email: validUser().email, password: validUser().password, ...overrides },
  })

const findCookie = (setCookieHeaders, name) =>
  setCookieHeaders.find((header) => header.startsWith(`${name}=`))

before(async () => {
  process.env.NODE_ENV = 'test'
  process.env.CLIENT_URL = allowedOrigin
  process.env.JWT_ACCESS_SECRET = 'test-only-access-secret'
  process.env.JWT_REFRESH_SECRET = 'test-only-refresh-secret'
  process.env.JWT_ACCESS_EXPIRES_IN = '15m'
  process.env.JWT_REFRESH_EXPIRES_IN = '7d'

  mongoServer = await MongoMemoryServer.create()
  await mongoose.connect(mongoServer.getUri())

  server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  baseUrl = `http://127.0.0.1:${server.address().port}`
})

beforeEach(async () => {
  resetCookies()
  resetRateLimiters()
  await mongoose.connection.db.dropDatabase()
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
  await mongoServer.stop()
})

test('registers a valid user and stores a hashed password', async () => {
  const response = await registerUser()

  assert.equal(response.status, 201)
  assert.equal(response.body.user.email, 'maryam@example.com')
  assert.equal(response.body.user.username, 'maryam_k')
  assert.ok(response.body.user.id)
  assert.equal(response.body.user.password, undefined)
  assert.equal(response.body.token, undefined)
  assert.equal(response.body.accessToken, undefined)
  assert.equal(response.body.refreshToken, undefined)

  const storedUser = await User.findOne({ email: 'maryam@example.com' }).select(
    '+password',
  )

  assert.ok(storedUser)
  assert.notEqual(storedUser.password, 'strongpass123')
  assert.equal(await comparePassword('strongpass123', storedUser.password), true)
})

test('rejects invalid registration data', async () => {
  const response = await registerUser({
    email: 'not-an-email',
    password: 'short',
  })

  assert.equal(response.status, 400)
  assert.equal(response.body.message, 'Validation failed')
  assert.deepEqual(
    response.body.errors.map((error) => error.field),
    ['email', 'password'],
  )
})

test('rejects a duplicate email', async () => {
  await registerUser()

  const response = await registerUser({ username: 'maryam_other' })

  assert.equal(response.status, 409)
  assert.match(response.body.message, /email.*already registered/i)
})

test('rejects a duplicate username', async () => {
  await registerUser()

  const response = await registerUser({ email: 'other@example.com' })

  assert.equal(response.status, 409)
  assert.match(response.body.message, /username.*already taken/i)
})

test('logs in with valid credentials and sets secure HttpOnly cookies', async () => {
  await registerUser()

  const response = await loginUser()

  assert.equal(response.status, 200)
  assert.equal(response.body.user.email, 'maryam@example.com')
  assert.equal(response.body.user.password, undefined)
  assert.equal(response.body.token, undefined)
  assert.equal(response.body.accessToken, undefined)
  assert.equal(response.body.refreshToken, undefined)

  const accessCookie = findCookie(response.setCookieHeaders, 'accessToken')
  const refreshCookie = findCookie(response.setCookieHeaders, 'refreshToken')

  assert.ok(accessCookie)
  assert.ok(refreshCookie)
  assert.match(accessCookie, /HttpOnly/i)
  assert.match(accessCookie, /SameSite=Lax/i)
  assert.match(accessCookie, /Path=\//i)
  assert.match(accessCookie, /Max-Age=900/i)
  assert.match(refreshCookie, /HttpOnly/i)
  assert.match(refreshCookie, /SameSite=Lax/i)
  assert.match(refreshCookie, /Path=\/api\/auth/i)
  assert.match(refreshCookie, /Max-Age=604800/i)

  assert.ok(cookies.get('accessToken'))
  assert.ok(cookies.get('refreshToken'))
})

test('issues access and refresh tokens with the configured lifetimes', async () => {
  await registerUser()
  await loginUser()

  const accessToken = jwt.decode(cookies.get('accessToken'))
  const refreshToken = jwt.decode(cookies.get('refreshToken'))

  assert.equal(accessToken.type, 'access')
  assert.equal(accessToken.exp - accessToken.iat, 15 * 60)
  assert.equal(refreshToken.type, 'refresh')
  assert.equal(refreshToken.exp - refreshToken.iat, 7 * 24 * 60 * 60)
})

test('marks authentication cookies Secure in production', async () => {
  await registerUser()

  const previousNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'

  try {
    const response = await loginUser()

    assert.equal(response.status, 200)

    const accessCookie = findCookie(response.setCookieHeaders, 'accessToken')
    const refreshCookie = findCookie(response.setCookieHeaders, 'refreshToken')

    assert.ok(accessCookie)
    assert.ok(refreshCookie)
    assert.match(accessCookie, /Secure/i)
    assert.match(refreshCookie, /Secure/i)
  } finally {
    process.env.NODE_ENV = previousNodeEnv
  }
})

test('stores only a hashed refresh token in the database', async () => {
  await registerUser()
  await loginUser()

  const refreshToken = cookies.get('refreshToken')
  const storedTokens = await RefreshToken.find({})

  assert.equal(storedTokens.length, 1)
  assert.notEqual(storedTokens[0].tokenHash, refreshToken)
  assert.equal(storedTokens[0].tokenHash, hashToken(refreshToken))
  assert.equal(storedTokens[0].tokenHash.length, 64)
})

test('rejects an incorrect password with a generic message', async () => {
  await registerUser()

  const response = await loginUser({ password: 'wrongpass123' })

  assert.equal(response.status, 401)
  assert.equal(response.body.message, 'Invalid email or password')
  assert.equal(response.body.token, undefined)
  assert.equal(cookies.get('accessToken'), undefined)
  assert.equal(cookies.get('refreshToken'), undefined)
})

test('rejects a non-existent email with the same generic message', async () => {
  const response = await loginUser({ email: 'missing@example.com' })

  assert.equal(response.status, 401)
  assert.equal(response.body.message, 'Invalid email or password')
})

test('rejects a protected request without an access token', async () => {
  const response = await api('/api/auth/me')

  assert.equal(response.status, 401)
  assert.match(response.body.message, /authentication required/i)
})

test('rejects a protected request with an invalid access token', async () => {
  const response = await api('/api/auth/me', {
    cookie: 'accessToken=not-a-real-token',
  })

  assert.equal(response.status, 401)
  assert.match(response.body.message, /invalid authentication token/i)
})

test('rejects an expired access token', async () => {
  const expiredAccessToken = jwt.sign(
    { sub: '507f1f77bcf86cd799439011', type: 'access' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '-1s' },
  )

  const response = await api('/api/auth/me', {
    cookie: `accessToken=${expiredAccessToken}`,
  })

  assert.equal(response.status, 401)
  assert.match(response.body.message, /access token expired/i)
})

test('rejects a refresh token used as an access token', async () => {
  await registerUser()
  await loginUser()

  const response = await api('/api/auth/me', {
    cookie: `accessToken=${cookies.get('refreshToken')}`,
  })

  assert.equal(response.status, 401)
  assert.match(response.body.message, /invalid authentication token/i)
})

test('allows a valid access cookie to access a protected endpoint', async () => {
  await registerUser()
  await loginUser()

  const response = await api('/api/auth/me')

  assert.equal(response.status, 200)
  assert.equal(response.body.user.email, 'maryam@example.com')
  assert.equal(response.body.user.username, 'maryam_k')
  assert.equal(response.body.user.password, undefined)
})

test('refreshes a session and rotates the refresh token', async () => {
  await registerUser()
  await loginUser()

  const previousRefreshToken = cookies.get('refreshToken')

  const response = await api('/api/auth/refresh', { method: 'POST' })

  assert.equal(response.status, 200)
  assert.equal(response.body.message, 'Session refreshed')
  assert.equal(response.body.user.email, 'maryam@example.com')
  assert.equal(response.body.token, undefined)
  assert.equal(response.body.accessToken, undefined)
  assert.equal(response.body.refreshToken, undefined)

  const nextRefreshToken = cookies.get('refreshToken')

  assert.ok(nextRefreshToken)
  assert.notEqual(nextRefreshToken, previousRefreshToken)

  const storedTokens = await RefreshToken.find({})
  assert.equal(storedTokens.length, 1)
  assert.equal(storedTokens[0].tokenHash, hashToken(nextRefreshToken))

  const rotatedResponse = await api('/api/auth/refresh', {
    method: 'POST',
    cookie: `refreshToken=${previousRefreshToken}`,
  })

  assert.equal(rotatedResponse.status, 401)
  assert.match(rotatedResponse.body.message, /no longer valid/i)
})

test('consumes a refresh token only once during concurrent refresh requests', async () => {
  await registerUser()
  await loginUser()

  const refreshToken = cookies.get('refreshToken')

  const [firstResponse, secondResponse] = await Promise.all([
    api('/api/auth/refresh', {
      method: 'POST',
      cookie: `refreshToken=${refreshToken}`,
    }),
    api('/api/auth/refresh', {
      method: 'POST',
      cookie: `refreshToken=${refreshToken}`,
    }),
  ])

  const statuses = [firstResponse.status, secondResponse.status].sort()
  assert.deepEqual(statuses, [200, 401])

  const successfulResponse =
    firstResponse.status === 200 ? firstResponse : secondResponse
  const rejectedResponse =
    firstResponse.status === 200 ? secondResponse : firstResponse

  assert.equal(successfulResponse.body.user.email, 'maryam@example.com')
  assert.match(rejectedResponse.body.message, /no longer valid/i)

  const replacementCookie = findCookie(
    successfulResponse.setCookieHeaders,
    'refreshToken',
  )
  assert.ok(replacementCookie)

  const replacementToken = replacementCookie
    .split(';')[0]
    .replace('refreshToken=', '')

  const storedTokens = await RefreshToken.find({})
  assert.equal(storedTokens.length, 1)
  assert.equal(storedTokens[0].tokenHash, hashToken(replacementToken))
})

test('keeps other active refresh tokens when one token is consumed', async () => {
  await registerUser()

  await loginUser()
  const firstRefreshToken = cookies.get('refreshToken')

  await loginUser()
  const secondRefreshToken = cookies.get('refreshToken')

  assert.notEqual(firstRefreshToken, secondRefreshToken)
  assert.equal(await RefreshToken.countDocuments(), 2)

  const response = await api('/api/auth/refresh', {
    method: 'POST',
    cookie: `refreshToken=${firstRefreshToken}`,
  })

  assert.equal(response.status, 200)
  assert.equal(await RefreshToken.countDocuments(), 2)
  assert.ok(
    await RefreshToken.exists({ tokenHash: hashToken(secondRefreshToken) }),
  )
  assert.equal(
    await RefreshToken.exists({ tokenHash: hashToken(firstRefreshToken) }),
    null,
  )

  const replayResponse = await api('/api/auth/refresh', {
    method: 'POST',
    cookie: `refreshToken=${firstRefreshToken}`,
  })

  assert.equal(replayResponse.status, 401)
  assert.match(replayResponse.body.message, /no longer valid/i)
  assert.equal(await RefreshToken.countDocuments(), 2)
  assert.ok(
    await RefreshToken.exists({ tokenHash: hashToken(secondRefreshToken) }),
  )
})

test('rejects a refresh request without a refresh token', async () => {
  const response = await api('/api/auth/refresh', {
    method: 'POST',
    useCookies: false,
  })

  assert.equal(response.status, 401)
  assert.match(response.body.message, /refresh token is required/i)
})

test('rejects an invalid refresh token', async () => {
  const response = await api('/api/auth/refresh', {
    method: 'POST',
    cookie: 'refreshToken=not-a-real-token',
  })

  assert.equal(response.status, 401)
  assert.match(response.body.message, /invalid refresh token/i)
})

test('rejects an access token used as a refresh token', async () => {
  await registerUser()
  await loginUser()

  const response = await api('/api/auth/refresh', {
    method: 'POST',
    cookie: `refreshToken=${cookies.get('accessToken')}`,
  })

  assert.equal(response.status, 401)
  assert.match(response.body.message, /invalid refresh token/i)
})

test('rejects an expired refresh token', async () => {
  const expiredRefreshToken = jwt.sign(
    { sub: '507f1f77bcf86cd799439011', type: 'refresh', jti: 'expired' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '-1s' },
  )

  const response = await api('/api/auth/refresh', {
    method: 'POST',
    cookie: `refreshToken=${expiredRefreshToken}`,
  })

  assert.equal(response.status, 401)
  assert.match(response.body.message, /session expired/i)
})

test('logs out, revokes the refresh token, and clears both cookies', async () => {
  await registerUser()
  await loginUser()

  const response = await api('/api/auth/logout', { method: 'POST' })

  assert.equal(response.status, 200)
  assert.match(response.body.message, /logged out/i)

  const accessCookie = findCookie(response.setCookieHeaders, 'accessToken')
  const refreshCookie = findCookie(response.setCookieHeaders, 'refreshToken')

  assert.ok(accessCookie)
  assert.ok(refreshCookie)
  assert.match(accessCookie, /Expires=Thu, 01 Jan 1970/i)
  assert.match(refreshCookie, /Expires=Thu, 01 Jan 1970/i)

  assert.equal(cookies.get('accessToken'), undefined)
  assert.equal(cookies.get('refreshToken'), undefined)
  assert.equal(await RefreshToken.countDocuments(), 0)

  const meResponse = await api('/api/auth/me')
  assert.equal(meResponse.status, 401)

  const refreshResponse = await api('/api/auth/refresh', { method: 'POST' })
  assert.equal(refreshResponse.status, 401)
})

test('allows a request whose Origin exactly matches the configured frontend origin', async () => {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: validUser(),
    origin: allowedOrigin,
  })

  assert.equal(response.status, 201)
})

test('rejects a request with a different Origin', async () => {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: validUser(),
    origin: 'http://localhost:4000',
  })

  assert.equal(response.status, 403)
  assert.match(response.body.message, /origin.*not allowed/i)
})

test('rejects a request with a missing Origin', async () => {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: validUser(),
    origin: null,
  })

  assert.equal(response.status, 403)
  assert.match(response.body.message, /origin.*not allowed/i)
})

test('rejects an Origin with a similar but different hostname', async () => {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: validUser(),
    origin: 'http://localhost.evil.example:5173',
  })

  assert.equal(response.status, 403)
  assert.match(response.body.message, /origin.*not allowed/i)
})

test('rejects an Origin with a different port', async () => {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: validUser(),
    origin: 'http://localhost:5174',
  })

  assert.equal(response.status, 403)
  assert.match(response.body.message, /origin.*not allowed/i)
})

test('rejects an Origin with a different protocol', async () => {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: validUser(),
    origin: 'https://localhost:5173',
  })

  assert.equal(response.status, 403)
  assert.match(response.body.message, /origin.*not allowed/i)
})

test('rejects missing or invalid Origin on every state-changing auth route', async () => {
  const stateChangingRoutes = [
    { path: '/api/auth/register', body: validUser() },
    {
      path: '/api/auth/login',
      body: { email: validUser().email, password: validUser().password },
    },
    { path: '/api/auth/refresh' },
    { path: '/api/auth/logout' },
  ]

  for (const { path, body } of stateChangingRoutes) {
    const missingOrigin = await api(path, {
      method: 'POST',
      body,
      origin: null,
    })

    assert.equal(missingOrigin.status, 403, `${path} without Origin`)
    assert.match(missingOrigin.body.message, /origin.*not allowed/i)

    const invalidOrigin = await api(path, {
      method: 'POST',
      body,
      origin: 'https://evil.example',
    })

    assert.equal(invalidOrigin.status, 403, `${path} with invalid Origin`)
    assert.match(invalidOrigin.body.message, /origin.*not allowed/i)
  }
})

test('does not create a user or issue cookies when Origin is invalid', async () => {
  const response = await api('/api/auth/register', {
    method: 'POST',
    body: validUser(),
    origin: 'https://evil.example',
  })

  assert.equal(response.status, 403)
  assert.equal(await User.countDocuments(), 0)
  assert.equal(response.setCookieHeaders.length, 0)
  assert.equal(cookies.get('accessToken'), undefined)
  assert.equal(cookies.get('refreshToken'), undefined)
})

test('does not rotate or revoke a refresh token when Origin is invalid', async () => {
  await registerUser()
  await loginUser()

  const refreshToken = cookies.get('refreshToken')

  const refreshResponse = await api('/api/auth/refresh', {
    method: 'POST',
    origin: 'https://evil.example',
  })

  assert.equal(refreshResponse.status, 403)
  assert.equal(await RefreshToken.countDocuments(), 1)
  assert.ok(await RefreshToken.exists({ tokenHash: hashToken(refreshToken) }))
  assert.equal(cookies.get('refreshToken'), refreshToken)

  const logoutResponse = await api('/api/auth/logout', {
    method: 'POST',
    origin: 'https://evil.example',
  })

  assert.equal(logoutResponse.status, 403)
  assert.equal(await RefreshToken.countDocuments(), 1)
  assert.ok(await RefreshToken.exists({ tokenHash: hashToken(refreshToken) }))
})

test('allows GET /api/auth/me without an Origin header', async () => {
  await registerUser()
  await loginUser()

  const response = await api('/api/auth/me', { origin: null })

  assert.equal(response.status, 200)
  assert.equal(response.body.user.email, 'maryam@example.com')
})

test('does not reject OPTIONS preflight requests', async () => {
  const response = await api('/api/auth/login', {
    method: 'OPTIONS',
    origin: 'https://evil.example',
  })

  assert.notEqual(response.status, 403)
  assert.ok([200, 204].includes(response.status))
})
