export const requireAuth = (req, res, next) => {
    if (!req.session || !req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
};  