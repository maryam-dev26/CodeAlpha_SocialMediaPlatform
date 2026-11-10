import crypto from 'node:crypto'

import jwt from 'jsonwebtoken'

const ACCESS_TOKEN_COOKIE = 'accessToken'
const REFRESH_TOKEN_COOKIE = 'refreshToken'

const UNIT_TO_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
}

const durationToMs = (value, fallback) => {
  const match = /^(\d+)([smhd])$/.exec(String(value || ''))

  if (!match) {
    return fallback
  }

  return Number(match[1]) * UNIT_TO_MS[match[2]]
}

const getSecret = (name) => {
  const secret = process.env[name]

  if (!secret) {
    throw new Error(`${name} is not configured`)
  }

  return secret
}

const baseCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
})

const accessCookieOptions = () => ({
  ...baseCookieOptions(),
  path: '/',
  maxAge: durationToMs(process.env.JWT_ACCESS_EXPIRES_IN, 15 * 60 * 1000),
})

const refreshCookieOptions = () => ({
  ...baseCookieOptions(),
  path: '/api/auth',
  maxAge: durationToMs(process.env.JWT_REFRESH_EXPIRES_IN, 7 * 24 * 60 * 60 * 1000),
})

const signAccessToken = (userId) =>
  jwt.sign(
    { sub: String(userId), type: 'access' },
    getSecret('JWT_ACCESS_SECRET'),
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' },
  )

const signRefreshToken = (userId) =>
  jwt.sign(
    { sub: String(userId), type: 'refresh', jti: crypto.randomUUID() },
    getSecret('JWT_REFRESH_SECRET'),
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
  )

const verifyAccessToken = (token) => {
  const payload = jwt.verify(token, getSecret('JWT_ACCESS_SECRET'))

  if (payload.type !== 'access') {
    throw new jwt.JsonWebTokenError('Invalid token type')
  }

  return payload
}

const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, getSecret('JWT_REFRESH_SECRET'))

  if (payload.type !== 'refresh') {
    throw new jwt.JsonWebTokenError('Invalid token type')
  }

  return payload
}

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex')

const getTokenExpiry = (token) => new Date(jwt.decode(token).exp * 1000)

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(ACCESS_TOKEN_COOKIE, accessToken, accessCookieOptions())
  res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, refreshCookieOptions())
}

const clearAuthCookies = (res) => {
  const { httpOnly, secure, sameSite } = baseCookieOptions()

  res.clearCookie(ACCESS_TOKEN_COOKIE, { httpOnly, secure, sameSite, path: '/' })
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly,
    secure,
    sameSite,
    path: '/api/auth',
  })
}

const isAuthConfigured = () =>
  Boolean(process.env.JWT_ACCESS_SECRET && process.env.JWT_REFRESH_SECRET)

export {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  clearAuthCookies,
  getTokenExpiry,
  hashToken,
  isAuthConfigured,
  setAuthCookies,
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
}
