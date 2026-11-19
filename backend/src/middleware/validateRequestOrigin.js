const defaultAllowedOrigin = 'http://localhost:5173'
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS'])

const rejectRequestOrigin = (res) =>
  res.status(403).json({ message: 'Request origin is not allowed' })

export const validateRequestOrigin = (req, res, next) => {
  if (safeMethods.has(req.method)) {
    return next()
  }

  const allowedOrigin = process.env.CLIENT_URL || defaultAllowedOrigin
  const requestOrigin = req.get('Origin')

  if (!requestOrigin || requestOrigin !== allowedOrigin) {
    return rejectRequestOrigin(res)
  }

  return next()
}
