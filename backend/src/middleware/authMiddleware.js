import jwt from 'jsonwebtoken'

import User from '../models/User.js'
import { toSafeUser } from '../utils/user.js'

const unauthorized = (res, message) => res.status(401).json({ message })

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return unauthorized(res, 'Authentication required')
  }

  const [scheme, token] = authHeader.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return unauthorized(res, 'Authentication required')
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    const user = await User.findById(payload.sub)

    if (!user) {
      return unauthorized(res, 'User account no longer exists')
    }

    req.user = toSafeUser(user)

    return next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, 'Session expired, please log in again')
    }

    return unauthorized(res, 'Invalid authentication token')
  }
}
