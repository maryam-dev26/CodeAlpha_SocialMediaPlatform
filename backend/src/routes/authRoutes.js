import { Router } from 'express'

import {
  getCurrentUser,
  login,
  logout,
  refresh,
  register,
} from '../controllers/authController.js'
import { protect } from '../middleware/authMiddleware.js'
import {
  loginRateLimiter,
  refreshRateLimiter,
  registerRateLimiter,
} from '../middleware/rateLimiters.js'
import { validateRequestOrigin } from '../middleware/validateRequestOrigin.js'

const router = Router()

router.use(validateRequestOrigin)

router.post('/register', registerRateLimiter, register)
router.post('/login', loginRateLimiter, login)
router.post('/refresh', refreshRateLimiter, refresh)
router.post('/logout', logout)
router.get('/me', protect, getCurrentUser)

export default router
