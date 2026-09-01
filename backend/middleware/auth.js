import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'tawarda-secret-2024'

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET)
}

export function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح' })
  }
  try {
    req.user = verifyToken(auth.slice(7))
    next()
  } catch {
    res.status(401).json({ error: 'جلسة منتهية' })
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (!req.user?.isAdmin) return res.status(403).json({ error: 'غير مصرح للمدير فقط' })
    next()
  })
}
