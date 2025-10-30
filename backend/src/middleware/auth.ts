import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import db from "../config/database";
import { AuthenticatedRequest, User } from "../types";

interface JwtPayload {
  userId: string;
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "Access token required" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;

    // Verify user still exists
    const userResult = await db.query<
      Pick<User, "id" | "email" | "first_name" | "last_name" | "role">
    >(
      "SELECT id, email, first_name, last_name, role FROM users WHERE id = $1",
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      res.status(401).json({ message: "User not found" });
      return;
    }

    const user = userResult.rows[0];
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ message: "Invalid token" });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({ message: "Token expired" });
      return;
    }
    res.status(500).json({ message: "Server error during authentication" });
  }
};
