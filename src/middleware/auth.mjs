export const requireAuth = (req, res, next) => {
    if (!req.session || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
};

export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized. Admin access required.' });
  }
  next();
};