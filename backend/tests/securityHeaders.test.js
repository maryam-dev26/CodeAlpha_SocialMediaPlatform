import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'

import app from '../src/app.js'

let server
let baseUrl

before(async () => {
  server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })

  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
})

const getHealth = () => fetch(`${baseUrl}/api/health`)

test('sets X-Content-Type-Options to nosniff', async () => {
  const response = await getHealth()

  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
})

test('sets X-Frame-Options to SAMEORIGIN', async () => {
  const response = await getHealth()

  assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN')
})

test('sets a Content-Security-Policy header', async () => {
  const response = await getHealth()
  const contentSecurityPolicy = response.headers.get('content-security-policy')

  assert.ok(contentSecurityPolicy)
  assert.match(contentSecurityPolicy, /default-src 'self'/)
  assert.match(contentSecurityPolicy, /object-src 'none'/)
})

test('sets Referrer-Policy to no-referrer', async () => {
  const response = await getHealth()

  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
})

test('keeps the health endpoint response body and status unchanged', async () => {
  const response = await getHealth()
  const body = await response.json()

  assert.equal(response.status, 503)
  assert.equal(body.status, 'degraded')
  assert.equal(body.server, 'running')
  assert.equal(body.database, 'disconnected')
  assert.equal(typeof body.uptime, 'number')
  assert.ok(body.uptime >= 0)
  assert.ok(!Number.isNaN(Date.parse(body.timestamp)))
})

test('does not interfere with CORS preflight requests', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'OPTIONS',
    headers: {
      Origin: 'http://localhost:5173',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type',
    },
  })

  assert.equal(response.status, 204)
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'http://localhost:5173',
  )
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
})

test('keeps authentication routes reachable with security headers', async () => {
  const response = await fetch(`${baseUrl}/api/auth/me`)

  assert.equal(response.status, 401)
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
})

test('keeps Origin validation behavior on state-changing auth routes', async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Origin: 'https://evil.example',
    },
    body: JSON.stringify({
      email: 'maryam@example.com',
      password: 'strongpass123',
    }),
  })

  assert.equal(response.status, 403)
  assert.equal((await response.json()).message, 'Request origin is not allowed')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff')
})
