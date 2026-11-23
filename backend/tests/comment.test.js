import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../src/app.js'
import Comment from '../src/models/Comment.js'
import Post from '../src/models/Post.js'
import { resetRateLimiters } from '../src/middleware/rateLimiters.js'

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

const createComment = (postId, user, body = { content: 'A helpful comment' }) =>
  request(`/api/posts/${postId}/comments`, {
    method: 'POST',
    cookie: user?.cookie,
    body,
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

test('rejects creating a comment without authentication', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const response = await createComment(post.body.post.id)

  assert.equal(response.status, 401)
  assert.equal(await Comment.countDocuments(), 0)
})

test('creates a comment for the logged-in user without exposing author email', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const response = await createComment(post.body.post.id, owner)

  assert.equal(response.status, 201)
  assert.equal(response.body.comment.content, 'A helpful comment')
  assert.equal(response.body.comment.author.id, owner.id)
  assert.equal(response.body.comment.author.username, 'maya_user')
  assert.equal(response.body.comment.author.email, undefined)
})

test('rejects author in the comment body', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const response = await createComment(post.body.post.id, owner, {
    content: 'Spoofed comment',
    author: owner.id,
  })

  assert.equal(response.status, 400)
  assert.equal(await Comment.countDocuments(), 0)
})

test('returns 404 when creating a comment on a post that does not exist', async () => {
  const user = await createUser('maya')
  const missingPostId = new mongoose.Types.ObjectId().toString()

  const response = await createComment(missingPostId, user)

  assert.equal(response.status, 404)
  assert.equal(await Comment.countDocuments(), 0)
})

test('rejects empty or oversized comment content', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  for (const content of ['', '   ', 'x'.repeat(1001)]) {
    const response = await createComment(post.body.post.id, owner, { content })
    assert.equal(response.status, 400)
  }

  assert.equal(await Comment.countDocuments(), 0)
})

test('allows guests to view comments without exposing author email', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)
  await createComment(post.body.post.id, owner)

  const response = await request(`/api/posts/${post.body.post.id}/comments`)

  assert.equal(response.status, 200)
  assert.equal(response.body.comments.length, 1)
  assert.equal(response.body.comments[0].content, 'A helpful comment')
  assert.equal(response.body.comments[0].author.id, owner.id)
  assert.equal(response.body.comments[0].author.email, undefined)
})

test('does not let a third user delete a comment', async () => {
  const owner = await createUser('maya')
  const commenter = await createUser('omar')
  const thirdUser = await createUser('sara')
  const post = await createPost(owner)
  const createdComment = await createComment(post.body.post.id, commenter)

  const response = await request(
    `/api/posts/${post.body.post.id}/comments/${createdComment.body.comment.id}`,
    { method: 'DELETE', cookie: thirdUser.cookie },
  )

  assert.equal(response.status, 403)
  assert.ok(await Comment.exists({ _id: createdComment.body.comment.id }))
})

test('lets the comment author delete their comment', async () => {
  const owner = await createUser('maya')
  const commenter = await createUser('omar')
  const post = await createPost(owner)
  const createdComment = await createComment(post.body.post.id, commenter)

  const response = await request(
    `/api/posts/${post.body.post.id}/comments/${createdComment.body.comment.id}`,
    { method: 'DELETE', cookie: commenter.cookie },
  )

  assert.equal(response.status, 200)
  assert.equal(await Comment.countDocuments(), 0)
})

test("lets the post owner delete another user's comment", async () => {
  const owner = await createUser('maya')
  const commenter = await createUser('omar')
  const post = await createPost(owner)
  const createdComment = await createComment(post.body.post.id, commenter)

  const response = await request(
    `/api/posts/${post.body.post.id}/comments/${createdComment.body.comment.id}`,
    { method: 'DELETE', cookie: owner.cookie },
  )

  assert.equal(response.status, 200)
  assert.equal(await Comment.countDocuments(), 0)
})

test('does not delete a comment through a different post URL', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)
  const otherPost = await createPost(owner, { title: 'Another post' })
  const createdComment = await createComment(post.body.post.id, owner)

  const response = await request(
    `/api/posts/${otherPost.body.post.id}/comments/${createdComment.body.comment.id}`,
    { method: 'DELETE', cookie: owner.cookie },
  )

  assert.equal(response.status, 404)
  assert.ok(await Comment.exists({ _id: createdComment.body.comment.id }))
})

test("deletes a post's comments when the post is deleted", async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)
  await createComment(post.body.post.id, owner)
  await createComment(post.body.post.id, owner, { content: 'Another comment' })

  const response = await request(`/api/posts/${post.body.post.id}`, {
    method: 'DELETE',
    cookie: owner.cookie,
  })

  assert.equal(response.status, 200)
  assert.equal(await Post.exists({ _id: post.body.post.id }), null)
  assert.equal(await Comment.countDocuments({ post: post.body.post.id }), 0)
})
