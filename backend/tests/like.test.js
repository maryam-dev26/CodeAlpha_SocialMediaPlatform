import { after, before, beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

import mongoose from 'mongoose'
import { MongoMemoryServer } from 'mongodb-memory-server'

import app from '../src/app.js'
import Like from '../src/models/Like.js'
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

// Registers and logs in a user; returns their id and a Cookie header value
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

const createPost = (user, overrides = {}) =>
  request('/api/posts', {
    method: 'POST',
    cookie: user.cookie,
    body: {
      type: 'journey',
      title: 'Week one with React',
      content: 'I finally understood useState today.',
      ...overrides,
    },
  })

const like = (postId, user, options = {}) =>
  request(`/api/posts/${postId}/like`, {
    method: 'POST',
    cookie: user?.cookie,
    ...options,
  })

const unlike = (postId, user, options = {}) =>
  request(`/api/posts/${postId}/like`, {
    method: 'DELETE',
    cookie: user?.cookie,
    ...options,
  })

// Reads the feed; pass a user to read it as that logged-in user
const getFeed = (user) => request('/api/posts', { cookie: user?.cookie })

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
  // dropDatabase also drops indexes; rebuild the unique index before each test
  await Like.syncIndexes()
})

after(async () => {
  await new Promise((resolve) => server.close(resolve))
  await mongoose.disconnect()
  await mongoServer.stop()
})

// ---------- Authentication and request origin ----------

test('rejects liking and unliking without authentication', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const likeResponse = await like(post.body.post.id)
  assert.equal(likeResponse.status, 401)

  const unlikeResponse = await unlike(post.body.post.id)
  assert.equal(unlikeResponse.status, 401)

  assert.equal(await Like.countDocuments(), 0)
})

test('rejects a like request with a missing Origin', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const response = await like(post.body.post.id, owner, { origin: null })

  assert.equal(response.status, 403)
  assert.equal(await Like.countDocuments(), 0)
})

// ---------- Like ----------

test('likes a post for the logged-in user', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const response = await like(post.body.post.id, owner)

  assert.equal(response.status, 200)
  assert.equal(response.body.liked, true)
  assert.equal(response.body.likeCount, 1)

  assert.ok(await Like.exists({ post: post.body.post.id, user: owner.id }))
})

test('liking twice is idempotent and creates only one like', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const first = await like(post.body.post.id, owner)
  const second = await like(post.body.post.id, owner)

  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(second.body.likeCount, 1)
  assert.equal(await Like.countDocuments(), 1)
})

test('concurrent like requests from one user create only one like', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const responses = await Promise.all([
    like(post.body.post.id, owner),
    like(post.body.post.id, owner),
    like(post.body.post.id, owner),
  ])

  assert.deepEqual(
    responses.map((response) => response.status),
    [200, 200, 200],
  )
  assert.equal(await Like.countDocuments(), 1)
})

test('counts likes from different users separately', async () => {
  const owner = await createUser('maya')
  const other = await createUser('omar')
  const post = await createPost(owner)

  await like(post.body.post.id, owner)
  const response = await like(post.body.post.id, other)

  assert.equal(response.body.likeCount, 2)
  assert.equal(await Like.countDocuments(), 2)
})

test('ignores a user id sent in the request body', async () => {
  const owner = await createUser('maya')
  const other = await createUser('omar')
  const post = await createPost(owner)

  // The like must belong to the logged-in user, never to the body's user
  const response = await like(post.body.post.id, owner, {
    body: { user: other.id },
  })

  assert.equal(response.status, 200)
  assert.ok(await Like.exists({ post: post.body.post.id, user: owner.id }))
  assert.equal(
    await Like.exists({ post: post.body.post.id, user: other.id }),
    null,
  )
})

// ---------- Unlike ----------

test('unlikes a post', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)
  await like(post.body.post.id, owner)

  const response = await unlike(post.body.post.id, owner)

  assert.equal(response.status, 200)
  assert.equal(response.body.liked, false)
  assert.equal(response.body.likeCount, 0)
  assert.equal(await Like.countDocuments(), 0)
})

test('unliking a post that was never liked is idempotent', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)

  const response = await unlike(post.body.post.id, owner)

  assert.equal(response.status, 200)
  assert.equal(response.body.liked, false)
  assert.equal(response.body.likeCount, 0)
})

test("does not remove another user's like when unliking", async () => {
  const owner = await createUser('maya')
  const other = await createUser('omar')
  const post = await createPost(owner)

  await like(post.body.post.id, owner)
  await like(post.body.post.id, other)

  const response = await unlike(post.body.post.id, other)

  assert.equal(response.status, 200)
  assert.equal(response.body.likeCount, 1)
  assert.ok(await Like.exists({ post: post.body.post.id, user: owner.id }))
})

// ---------- Invalid post ids ----------

test('returns 404 for a malformed or unknown post id', async () => {
  const user = await createUser('maya')
  const missingPostId = new mongoose.Types.ObjectId().toString()

  for (const id of ['not-an-id', missingPostId]) {
    const likeResponse = await like(id, user)
    assert.equal(likeResponse.status, 404, `like ${id}`)

    const unlikeResponse = await unlike(id, user)
    assert.equal(unlikeResponse.status, 404, `unlike ${id}`)
  }

  assert.equal(await Like.countDocuments(), 0)
})

// ---------- Feed: likeCount and likedByMe ----------

test('feed shows likeCount and likedByMe false for a guest', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)
  await like(post.body.post.id, owner)

  // No cookie: the feed stays public
  const response = await getFeed()

  assert.equal(response.status, 200)
  assert.equal(response.body.posts[0].likeCount, 1)
  assert.equal(response.body.posts[0].likedByMe, false)
})

test('feed shows likedByMe true only for the user who liked the post', async () => {
  const owner = await createUser('maya')
  const other = await createUser('omar')
  const post = await createPost(owner)
  await like(post.body.post.id, owner)

  const asOwner = await getFeed(owner)
  assert.equal(asOwner.body.posts[0].likedByMe, true)
  assert.equal(asOwner.body.posts[0].likeCount, 1)

  const asOther = await getFeed(other)
  assert.equal(asOther.body.posts[0].likedByMe, false)
  assert.equal(asOther.body.posts[0].likeCount, 1)
})

test('feed reports the right count per post, including zero', async () => {
  const owner = await createUser('maya')
  const other = await createUser('omar')
  const liked = await createPost(owner, { title: 'Liked post' })
  await createPost(owner, { title: 'Unliked post' })

  await like(liked.body.post.id, owner)
  await like(liked.body.post.id, other)

  const response = await getFeed(owner)
  const byTitle = Object.fromEntries(
    response.body.posts.map((post) => [post.title, post]),
  )

  assert.equal(byTitle['Liked post'].likeCount, 2)
  assert.equal(byTitle['Unliked post'].likeCount, 0)
  assert.equal(byTitle['Unliked post'].likedByMe, false)
})

test('feed rejects an invalid access token instead of treating it as a guest', async () => {
  const response = await request('/api/posts', {
    cookie: 'accessToken=not-a-real-token',
  })

  // optionalAuth hands a present token to protect, so a bad token is a 401
  assert.equal(response.status, 401)
})

test('editing a post keeps its likeCount and likedByMe in the response', async () => {
  const owner = await createUser('maya')
  const post = await createPost(owner)
  await like(post.body.post.id, owner)

  const response = await request(`/api/posts/${post.body.post.id}`, {
    method: 'PATCH',
    cookie: owner.cookie,
    body: { title: 'Updated title', content: 'Updated content' },
  })

  assert.equal(response.status, 200)
  assert.equal(response.body.post.likeCount, 1)
  assert.equal(response.body.post.likedByMe, true)
})

// ---------- Cleanup ----------

test("deletes a post's likes when the post is deleted", async () => {
  const owner = await createUser('maya')
  const other = await createUser('omar')
  const post = await createPost(owner)
  const otherPost = await createPost(owner, { title: 'Another post' })

  await like(post.body.post.id, owner)
  await like(post.body.post.id, other)
  await like(otherPost.body.post.id, owner)

  const response = await request(`/api/posts/${post.body.post.id}`, {
    method: 'DELETE',
    cookie: owner.cookie,
  })

  assert.equal(response.status, 200)
  assert.equal(await Post.exists({ _id: post.body.post.id }), null)
  assert.equal(await Like.countDocuments({ post: post.body.post.id }), 0)

  // Likes on other posts must stay untouched
  assert.equal(await Like.countDocuments({ post: otherPost.body.post.id }), 1)
})