import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../types";

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Check if user exists (should be set by authenticateToken middleware)
    if (!req.user) {
      res.status(401).json({ message: "Authentication required" });
      return;
    }

    // Check if user has admin role
    if (req.user.role !== "admin") {
      res.status(403).json({ message: "Admin access required" });
      return;
    }

    next();
  } catch (error) {
    console.error("Admin middleware error:", error);
    res.status(500).json({ message: "Server error during authorization" });
  }
};
