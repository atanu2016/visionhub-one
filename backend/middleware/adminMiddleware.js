
function adminMiddleware(req, res, next) {
  // Check if user exists and has admin role
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Administrator access required' });
  }
  
  // Continue to next middleware
  next();
}

module.exports = adminMiddleware;
