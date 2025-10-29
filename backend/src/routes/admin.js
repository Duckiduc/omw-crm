const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult, query } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/admin");

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

// Get all users with pagination and filtering
router.get(
  "/users",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().trim(),
    query("role").optional().isIn(["user", "admin"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = req.query.page || 1;
      const limit = req.query.limit || 20;
      const offset = (page - 1) * limit;
      const { search, role } = req.query;

      let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1";
      let dataQuery = `
        SELECT id, email, first_name, last_name, role, created_at, updated_at
        FROM users 
        WHERE 1=1
      `;
      const params = [];
      let paramCount = 1;

      // Add filters
      if (search) {
        const searchCondition = ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        countQuery += searchCondition;
        dataQuery += searchCondition;
        params.push(`%${search}%`);
        paramCount++;
      }

      if (role) {
        const roleCondition = ` AND role = $${paramCount}`;
        countQuery += roleCondition;
        dataQuery += roleCondition;
        params.push(role);
        paramCount++;
      }

      dataQuery += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${
        paramCount + 1
      }`;

      const countParams = [...params];
      const dataParams = [...params, limit, offset];

      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, countParams),
        db.query(dataQuery, dataParams),
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      // Map field names to camelCase for frontend consistency
      const users = dataResult.rows.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }));

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Server error fetching users" });
    }
  }
);

// Get single user
router.get("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error fetching user" });
  }
});

// Create user
router.post(
  "/users",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 6 }),
    body("firstName").trim().isLength({ min: 1 }),
    body("lastName").trim().isLength({ min: 1 }),
    body("role").optional().isIn(["user", "admin"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role = "user" } = req.body;

      // Check if user exists
      const existingUser = await db.query(
        "SELECT id FROM users WHERE email = $1",
        [email]
      );

      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await db.query(
        "INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, created_at, updated_at",
        [email, hashedPassword, firstName, lastName, role]
      );

      const user = result.rows[0];
      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });
    } catch (error) {
      console.error("Create user error:", error);
      res.status(500).json({ message: "Server error creating user" });
    }
  }
);

// Update user
router.put(
  "/users/:id",
  [
    body("email").optional().isEmail().normalizeEmail(),
    body("password").optional().isLength({ min: 6 }),
    body("firstName").optional().trim().isLength({ min: 1 }),
    body("lastName").optional().trim().isLength({ min: 1 }),
    body("role").optional().isIn(["user", "admin"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      // Check if user exists
      const existingUser = await db.query(
        "SELECT id FROM users WHERE id = $1",
        [id]
      );

      if (existingUser.rows.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admin from demoting themselves
      if (req.user.id === parseInt(id) && updates.role === "user") {
        return res.status(400).json({
          message: "Cannot change your own admin role",
        });
      }

      // Check if email is already taken by another user
      if (updates.email) {
        const emailCheck = await db.query(
          "SELECT id FROM users WHERE email = $1 AND id != $2",
          [updates.email, id]
        );

        if (emailCheck.rows.length > 0) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === "password") {
          // Hash password if provided
          const saltRounds = 12;
          const hashedPassword = bcrypt.hashSync(value, saltRounds);
          fields.push(`password = $${paramCount}`);
          values.push(hashedPassword);
        } else {
          const dbField =
            key === "firstName"
              ? "first_name"
              : key === "lastName"
              ? "last_name"
              : key;
          fields.push(`${dbField} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      });

      if (fields.length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);

      const query = `
        UPDATE users 
        SET ${fields.join(", ")} 
        WHERE id = $${paramCount} 
        RETURNING id, email, first_name, last_name, role, created_at, updated_at
      `;

      const result = await db.query(query, values);

      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ message: "Server error updating user" });
    }
  }
);

// Delete user
router.delete("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.id === parseInt(id)) {
      return res.status(400).json({
        message: "Cannot delete your own account",
      });
    }

    const result = await db.query(
      "DELETE FROM users WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error deleting user" });
  }
});

// Get system settings
router.get("/settings", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key"
    );

    // Convert to object format for easier frontend consumption
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description,
      };
    });

    res.json({ settings });
  } catch (error) {
    console.error("Get system settings error:", error);
    res.status(500).json({ message: "Server error fetching system settings" });
  }
});

// Update system setting
router.put(
  "/settings/:key",
  [body("value").notEmpty().withMessage("Setting value is required")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { key } = req.params;
      const { value } = req.body;

      // Validate specific setting types
      if (
        key === "registration_enabled" &&
        !["true", "false"].includes(value)
      ) {
        return res.status(400).json({
          message: "registration_enabled must be 'true' or 'false'",
        });
      }

      if (key === "max_users" && (isNaN(value) || parseInt(value) < 0)) {
        return res.status(400).json({
          message: "max_users must be a non-negative number",
        });
      }

      // Update setting
      const result = await db.query(
        `UPDATE system_settings 
         SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE setting_key = $2 
         RETURNING setting_key, setting_value, description`,
        [value, key]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Setting not found" });
      }

      const setting = result.rows[0];
      res.json({
        setting_key: setting.setting_key,
        setting_value: setting.setting_value,
        description: setting.description,
      });
    } catch (error) {
      console.error("Update system setting error:", error);
      res.status(500).json({ message: "Server error updating system setting" });
    }
  }
);

// Get user statistics
router.get("/users/stats/overview", async (req, res) => {
  try {
    const stats = await Promise.all([
      db.query("SELECT COUNT(*) as total FROM users"),
      db.query("SELECT COUNT(*) as admins FROM users WHERE role = 'admin'"),
      db.query(
        "SELECT COUNT(*) as regular_users FROM users WHERE role = 'user'"
      ),
      db.query(`
        SELECT COUNT(*) as new_this_month 
        FROM users 
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `),
    ]);

    res.json({
      total: parseInt(stats[0].rows[0].total),
      admins: parseInt(stats[1].rows[0].admins),
      regularUsers: parseInt(stats[2].rows[0].regular_users),
      newThisMonth: parseInt(stats[3].rows[0].new_this_month),
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({ message: "Server error fetching user statistics" });
  }
});

module.exports = router;
