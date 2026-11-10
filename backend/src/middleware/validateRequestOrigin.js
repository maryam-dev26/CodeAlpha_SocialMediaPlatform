const DEFAULT_ALLOWED_ORIGIN = 'http://localhost:5173'
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const rejectRequestOrigin = (res) =>
  res.status(403).json({ message: 'Request origin is not allowed' })

export const validateRequestOrigin = (req, res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    return next()
  }

  const allowedOrigin = process.env.CLIENT_URL || DEFAULT_ALLOWED_ORIGIN
  const requestOrigin = req.get('Origin')

  if (!requestOrigin || requestOrigin !== allowedOrigin) {
    return rejectRequestOrigin(res)
  }

  return next()
}
