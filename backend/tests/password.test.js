import test from 'node:test'
import assert from 'node:assert/strict'

import { comparePassword, hashPassword } from '../src/utils/password.js'

const plainPassword = 'strongpass123'

test('hashPassword returns a hash different from the original password', async () => {
  const hash = await hashPassword(plainPassword)

  assert.notEqual(hash, plainPassword)
  assert.match(hash, /^\$2[aby]\$10\$/)
})

test('comparePassword matches the correct password', async () => {
  const hash = await hashPassword(plainPassword)

  assert.equal(await comparePassword(plainPassword, hash), true)
})

test('comparePassword rejects an incorrect password', async () => {
  const hash = await hashPassword(plainPassword)

  assert.equal(await comparePassword('wrongpass123', hash), false)
})
