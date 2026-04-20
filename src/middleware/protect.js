import jwt from 'jsonwebtoken'

function protect(req, res, next) {
  // PUBLIC ROUTES - No authentication required
  const publicRoutes = [
    { method: 'POST', path: '/maintenance' }
  ]
  
  const isPublicRoute = publicRoutes.some(route => 
    route.method === req.method && req.path === route.path
  )
  
  if (isPublicRoute) {
    return next()
  }

  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const token = header.split(' ')[1]

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role,
    }
    next()
  } catch (err) {
    return res.status(401).json({ message: 'Token invalid or expired' })
  }
}

export default protect