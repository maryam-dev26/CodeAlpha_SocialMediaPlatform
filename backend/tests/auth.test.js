import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../src/app.js'
import User from '../src/models/User.js'
import { comparePassword } from '../src/utils/password.js'

let mongoServer
let server
let baseUrl

const validUser = (overrides = {}) => ({
  name: 'Maryam Khan',
  username: 'maryam_k',
  email: 'maryam@example.com',
  password: 'strongpass123',
  ...overrides,
})

const api = async (path, { method = 'GET', body, token } = {}) => {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  return { status: response.status, body: await response.json() }
}

const registerUser = (overrides) =>
  api('/api/auth/register', { method: 'POST', body: validUser(overrides) })

const loginUser = (overrides) =>
  api('/api/auth/login', {
    method: 'POST',
    body: { email: validUser().email, password: validUser().password, ...overrides },
  })

before(async () => {
  process.env.JWT_SECRET = 'test-only-jwt-secret'
  process.env.JWT_EXPIRES_IN = '1h'

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

test('logs in with valid credentials and returns a token', async () => {
  await registerUser()

  const response = await loginUser()

  assert.equal(response.status, 200)
  assert.equal(typeof response.body.token, 'string')
  assert.ok(response.body.token.length > 0)
  assert.equal(response.body.user.email, 'maryam@example.com')
  assert.equal(response.body.user.password, undefined)
})

test('rejects an incorrect password with a generic message', async () => {
  await registerUser()

  const response = await loginUser({ password: 'wrongpass123' })

  assert.equal(response.status, 401)
  assert.equal(response.body.message, 'Invalid email or password')
  assert.equal(response.body.token, undefined)
})

test('rejects a non-existent email with the same generic message', async () => {
  const response = await loginUser({ email: 'missing@example.com' })

  assert.equal(response.status, 401)
  assert.equal(response.body.message, 'Invalid email or password')
})

test('rejects a protected request without a token', async () => {
  const response = await api('/api/auth/me')

  assert.equal(response.status, 401)
  assert.match(response.body.message, /authentication required/i)
})

test('rejects a protected request with an invalid token', async () => {
  const response = await api('/api/auth/me', { token: 'not-a-real-token' })

  assert.equal(response.status, 401)
  assert.match(response.body.message, /invalid authentication token/i)
})

test('allows a valid token to access a protected endpoint', async () => {
  await registerUser()
  const login = await loginUser()

  const response = await api('/api/auth/me', { token: login.body.token })

  assert.equal(response.status, 200)
  assert.equal(response.body.user.email, 'maryam@example.com')
  assert.equal(response.body.user.username, 'maryam_k')
  assert.equal(response.body.user.password, undefined)
})
