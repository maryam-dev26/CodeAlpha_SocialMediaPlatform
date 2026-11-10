import { MemoryStore, rateLimit } from 'express-rate-limit'

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE

const loginStore = new MemoryStore()
const registerStore = new MemoryStore()
const refreshStore = new MemoryStore()

const rateLimitResponse = {
  message: 'Too many requests. Please try again later.',
}

const createRateLimiter = (store, windowMs, limit) =>
  rateLimit({
    store,
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: rateLimitResponse,
  })

export const loginRateLimiter = createRateLimiter(
  loginStore,
  15 * MINUTE,
  10,
)

export const registerRateLimiter = createRateLimiter(
  registerStore,
  HOUR,
  5,
)

export const refreshRateLimiter = createRateLimiter(
  refreshStore,
  15 * MINUTE,
  30,
)

export const resetRateLimiters = () => {
  loginStore.resetAll()
  registerStore.resetAll()
  refreshStore.resetAll()
}
