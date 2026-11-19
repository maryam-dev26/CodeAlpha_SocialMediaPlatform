import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../src/app.js'
import { resetRateLimiters } from '../src/middleware/rateLimiters.js'
import Post from '../src/models/Post.js'

let mongoServer
let server
let baseUrl

const allowedOrigin = 'http://localhost:5173'

const request = async (
  path,
  { method = 'GET', body, cookie, origin = allowedOrigin } = {},
) => {
  const headers = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (method !== 'GET' && origin) {
    headers.Origin = origin
  }

  if (cookie) {
    headers.Cookie = cookie
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await response.text()

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    setCookies: response.headers.getSetCookie(),
  }
}

// Registers and logs in a user. Returns their id and a Cookie header value,
// so each test can act as a specific user.
const createUser = async (name) => {
  const credentials = {
    email: `${name}@example.com`,
    password: 'strongpass123',
  }

  await request('/api/auth/register', {
    method: 'POST',
    body: { name: `${name} Tester`, username: `${name}_user`, ...credentials },
  })

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: credentials,
  })

  return {
    id: login.body.user.id,
    cookie: login.setCookies.map((header) => header.split(';')[0]).join('; '),
  }
}

const validPost = (overrides = {}) => ({
  type: 'journey',
  title: 'Week one with React',
  content: 'I finally understood useState today.',
  ...overrides,
})

const createPost = (user, overrides) =>
  request('/api/posts', {
    method: 'POST',
    cookie: user.cookie,
    body: validPost(overrides),
  })

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
  resetRateLimiters()
  await mongoose.connection.db.dropDatabase()
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
  await mongoServer.stop()
})

test('rejects creating a post without authentication', async () => {
  const response = await request('/api/posts', {
    method: 'POST',
    body: validPost(),
  })

  assert.equal(response.status, 401)
  assert.equal(await Post.countDocuments(), 0)
})

test('rejects a state-changing request with a missing Origin', async () => {
  const user = await createUser('maya')

  const response = await request('/api/posts', {
    method: 'POST',
    cookie: user.cookie,
    body: validPost(),
    origin: null,
  })

  assert.equal(response.status, 403)
  assert.equal(await Post.countDocuments(), 0)
})

test('creates a post for the logged-in user and never exposes the author email', async () => {
  const user = await createUser('maya')

  const response = await createPost(user)

  assert.equal(response.status, 201)
  assert.equal(response.body.post.title, 'Week one with React')
  assert.equal(response.body.post.author.id, user.id)
  assert.equal(response.body.post.author.username, 'maya_user')
  assert.equal(response.body.post.author.email, undefined)
  assert.equal(response.body.post.author.password, undefined)
})

test('rejects an invalid type and unknown fields such as author', async () => {
  const user = await createUser('maya')

  const badType = await createPost(user, { type: 'bogus' })
  assert.equal(badType.status, 400)
  assert.equal(badType.body.errors[0].field, 'type')

  const spoofedAuthor = await createPost(user, {
    author: '507f1f77bcf86cd799439011',
  })
  assert.equal(spoofedAuthor.status, 400)

  assert.equal(await Post.countDocuments(), 0)
})

test('lists posts publicly, newest first, with pagination', async () => {
  const user = await createUser('maya')

  await createPost(user, { title: 'First post' })
  await createPost(user, { title: 'Second post' })
  await createPost(user, { title: 'Third post' })

  // No cookie: guests can read the feed
  const response = await request('/api/posts?limit=2')

  assert.equal(response.status, 200)
  assert.deepEqual(
    response.body.posts.map((post) => post.title),
    ['Third post', 'Second post'],
  )
  assert.equal(response.body.pagination.total, 3)
  assert.equal(response.body.pagination.totalPages, 2)

  const secondPage = await request('/api/posts?limit=2&page=2')
  assert.deepEqual(
    secondPage.body.posts.map((post) => post.title),
    ['First post'],
  )
})

test('filters the feed by post type', async () => {
  const user = await createUser('maya')

  await createPost(user, { type: 'journey', title: 'A journey post' })
  await createPost(user, { type: 'help', title: 'A help post' })

  const response = await request('/api/posts?type=help')

  assert.equal(response.status, 200)
  assert.equal(response.body.posts.length, 1)
  assert.equal(response.body.posts[0].type, 'help')
})

test('rejects invalid pagination and filter values', async () => {
  for (const query of ['page=0', 'limit=1000', 'limit=abc', 'type=bogus']) {
    const response = await request(`/api/posts?${query}`)
    assert.equal(response.status, 400, query)
  }
})

test('does not let another user edit a post', async () => {
  const owner = await createUser('maya')
  const other = await createUser('omar')
  const created = await createPost(owner)

  const response = await request(`/api/posts/${created.body.post.id}`, {
    method: 'PATCH',
    cookie: other.cookie,
    body: { title: 'Hijacked title', content: 'Hijacked content' },
  })

  assert.equal(response.status, 403)

  const stored = await Post.findById(created.body.post.id)
  assert.equal(stored.title, 'Week one with React')
})

test('does not let another user delete a post', async () => {
  const owner = await createUser('maya')
  const other = await createUser('omar')
  const created = await createPost(owner)

  const response = await request(`/api/posts/${created.body.post.id}`, {
    method: 'DELETE',
    cookie: other.cookie,
  })

  assert.equal(response.status, 403)
  assert.ok(await Post.exists({ _id: created.body.post.id }))
})

test('rejects editing and deleting without authentication', async () => {
  const owner = await createUser('maya')
  const created = await createPost(owner)
  const path = `/api/posts/${created.body.post.id}`

  const edit = await request(path, {
    method: 'PATCH',
    body: { title: 'No login here', content: 'Still no login' },
  })
  assert.equal(edit.status, 401)

  const remove = await request(path, { method: 'DELETE' })
  assert.equal(remove.status, 401)

  assert.ok(await Post.exists({ _id: created.body.post.id }))
})

test('lets the owner edit and then delete their post', async () => {
  const owner = await createUser('maya')
  const created = await createPost(owner)
  const path = `/api/posts/${created.body.post.id}`

  const edit = await request(path, {
    method: 'PATCH',
    cookie: owner.cookie,
    body: { title: 'Updated title', content: 'Updated content' },
  })

  assert.equal(edit.status, 200)
  assert.equal(edit.body.post.title, 'Updated title')
  // type is not editable
  assert.equal(edit.body.post.type, 'journey')

  const remove = await request(path, { method: 'DELETE', cookie: owner.cookie })

  assert.equal(remove.status, 200)
  assert.equal(await Post.countDocuments(), 0)
})

test('returns 404 for a malformed or unknown post id', async () => {
  const user = await createUser('maya')

  for (const id of ['not-an-id', '507f1f77bcf86cd799439011']) {
    const response = await request(`/api/posts/${id}`, {
      method: 'DELETE',
      cookie: user.cookie,
    })

    assert.equal(response.status, 404, id)
  }
})