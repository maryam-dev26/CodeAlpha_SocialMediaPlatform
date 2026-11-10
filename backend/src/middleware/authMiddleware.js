import User from '../models/User.js'
import { verifyAccessToken } from '../utils/tokens.js'
import { toSafeUser } from '../utils/user.js'

const unauthorized = (res, message) => res.status(401).json({ message })

export const protect = async (req, res, next) => {
  const token = req.cookies?.accessToken

  if (!token) {
    return unauthorized(res, 'Authentication required')
  }

  try {
    const payload = verifyAccessToken(token)
    const user = await User.findById(payload.sub)

    if (!user) {
      return unauthorized(res, 'User account no longer exists')
    }

    req.user = toSafeUser(user)

    return next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, 'Access token expired')
    }

    return unauthorized(res, 'Invalid authentication token')
  }
}
