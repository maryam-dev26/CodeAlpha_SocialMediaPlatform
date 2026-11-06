const test = require('node:test')
const assert = require('node:assert/strict')

const User = require('../src/models/User')

const baseUser = {
  name: 'Maryam Khan',
  username: 'maryam_k',
  password: 'strongpass123',
}

const validateEmail = (email) =>
  new User({ ...baseUser, email }).validate()

const validEmails = [
  'maryam@example.com',
  'user.name+tag@sub.example.co.uk',
  'first_last%x@a-b.co',
  'user+tag@example.io',
  'user@123.example.com',
  'user@example.museum',
  'UPPER.CASE@Example.COM',
]

const invalidEmails = [
  'plainaddress',
  'user name@example.com',
  'user@@example.com',
  '@example.com',
  'user@example',
  'user@example.c',
  'user@example.123',
  'user@example_com',
  'user@example..com',
  'user@.example.com',
  'user@example.com.',
  'user@-example.com',
  'user@example-.com',
  'user@sub.-example.com',
  'user@sub.example-.co.uk',
  'user..name@example.com',
  '.user@example.com',
  'user.@example.com',
]

for (const email of validEmails) {
  test(`accepts valid email: ${email}`, async () => {
    await assert.doesNotReject(validateEmail(email))
  })
}

for (const email of invalidEmails) {
  test(`rejects invalid email: ${email}`, async () => {
    await assert.rejects(validateEmail(email), (err) => {
      assert.ok(err.errors?.email, 'expected an email validation error')
      assert.match(err.errors.email.message, /valid email address/i)
      return true
    })
  })
}

test('lowercases the normalized email', async () => {
  const user = new User({ ...baseUser, email: 'Maryam@Example.COM' })
  await user.validate()
  assert.equal(user.email, 'maryam@example.com')
})
