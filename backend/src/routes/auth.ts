import express, { Response } from "express";
import bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";
import { body, validationResult } from "express-validator";
import db from "../config/database";
import { seedDefaultData } from "../database/migrate";
import { authenticateToken } from "../middleware/auth";
import {
  isRegistrationEnabled,
  isUserLimitReached,
} from "../utils/systemSettings";
import { AuthenticatedRequest, User } from "../types";

const router = express.Router();

interface RegisterRequestBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface LoginRequestBody {
  email: string;
  password: string;
}

interface UserExistsRow {
  id: string;
}

interface UserRow {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface NewUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

// Register
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").trim().isLength({ min: 1 }),
    body("lastName").trim().isLength({ min: 1 }),
  ],
  async (req: express.Request<{}, {}, RegisterRequestBody>, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      // Check if registration is enabled
      const registrationEnabled = await isRegistrationEnabled();
      if (!registrationEnabled) {
        res.status(403).json({
          message:
            "User registration is currently disabled by the administrator",
        });
        return;
      }

      // Check if user limit is reached
      const limitReached = await isUserLimitReached();
      if (limitReached) {
        res.status(403).json({
          message: "Maximum number of users reached. Contact administrator.",
        });
        return;
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if user exists
      const existingUser = await db.query<UserExistsRow>(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        res.status(400).json({ message: "User already exists" });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await db.query<NewUserRow>(
        "INSERT INTO users (email, password, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name",
        [email, hashedPassword, firstName, lastName]
      );

      const user = result.rows[0];

      // Seed default data for new user
      await seedDefaultData(user.id);

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error("JWT_SECRET not configured");
      }

      const token = (jwt.sign as any)(
        { userId: user.id, email: user.email },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      res.status(201).json({
        message: "User created successfully",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: "user",
        },
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  }
);

// Login
router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").exists()],
  async (req: express.Request<{}, {}, LoginRequestBody>, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      // Find user
      const result = await db.query<UserRow>(
        "SELECT id, email, password, first_name, last_name, role FROM users WHERE email = $1",
        [email]
      );

      if (result.rows.length === 0) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const user = result.rows[0];

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      // Generate JWT token
      const jwtSecret2 = process.env.JWT_SECRET;
      if (!jwtSecret2) {
        throw new Error("JWT_SECRET not configured");
      }

      const token = (jwt.sign as any)(
        { userId: user.id, email: user.email },
        jwtSecret2,
        { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
      );

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role || "user",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  }
);

// Get current user
router.get(
  "/me",
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    res.json({
      user: {
        id: req.user.userId,
        email: req.user.email,
        firstName: req.user.userId, // Note: Need to fetch full user data
        lastName: req.user.userId, // Note: Need to fetch full user data
        role: req.user.role || "user",
      },
    });
  }
);

// Logout (client-side token removal)
router.post(
  "/logout",
  authenticateToken,
  (req: AuthenticatedRequest, res: Response) => {
    res.json({ message: "Logged out successfully" });
  }
);

export default router;
