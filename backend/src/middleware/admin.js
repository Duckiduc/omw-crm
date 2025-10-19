const requireAdmin = (req, res, next) => {
  try {
    // Check if user exists (should be set by authenticateToken middleware)
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    // Check if user has admin role
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    return res
      .status(500)
      .json({ message: "Server error during authorization" });
  }
};

module.exports = { requireAdmin };
