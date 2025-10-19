const express = require("express");
const { body, validationResult, query } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all items shared with the current user
router.get(
  "/shared-with-me",
  [
    query("type").optional().isIn(["contact", "activity", "deal"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
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
      const { type } = req.query;

      let whereClause = "WHERE s.shared_with = $1";
      const params = [req.user.id];
      let paramCount = 2;

      if (type) {
        whereClause += ` AND s.resource_type = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      const query = `
        SELECT 
          s.*,
          u.first_name as shared_by_first_name,
          u.last_name as shared_by_last_name,
          u.email as shared_by_email,
          CASE 
            WHEN s.resource_type = 'contact' THEN 
              (SELECT row_to_json(c) FROM (
                SELECT id, first_name, last_name, email, phone, position, status
                FROM contacts WHERE id = s.resource_id
              ) c)
            WHEN s.resource_type = 'activity' THEN 
              (SELECT row_to_json(a) FROM (
                SELECT id, type, subject, description, due_date, completed
                FROM activities WHERE id = s.resource_id
              ) a)
            WHEN s.resource_type = 'deal' THEN 
              (SELECT row_to_json(d) FROM (
                SELECT id, title, value, currency, probability, notes
                FROM deals WHERE id = s.resource_id
              ) d)
          END as resource_data
        FROM shares s
        JOIN users u ON s.shared_by = u.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const countQuery = `
        SELECT COUNT(*) FROM shares s ${whereClause}
      `;

      const [dataResult, countResult] = await Promise.all([
        db.query(query, [...params, limit, offset]),
        db.query(countQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.json({
        shares: dataResult.rows,
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
      console.error("Get shared items error:", error);
      res.status(500).json({ message: "Server error fetching shared items" });
    }
  }
);

// Get all items shared by the current user
router.get(
  "/shared-by-me",
  [
    query("type").optional().isIn(["contact", "activity", "deal"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
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
      const { type } = req.query;

      let whereClause = "WHERE s.shared_by = $1";
      const params = [req.user.id];
      let paramCount = 2;

      if (type) {
        whereClause += ` AND s.resource_type = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      const query = `
        SELECT 
          s.*,
          u.first_name as shared_with_first_name,
          u.last_name as shared_with_last_name,
          u.email as shared_with_email
        FROM shares s
        JOIN users u ON s.shared_with = u.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const countQuery = `
        SELECT COUNT(*) FROM shares s ${whereClause}
      `;

      const [dataResult, countResult] = await Promise.all([
        db.query(query, [...params, limit, offset]),
        db.query(countQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.json({
        shares: dataResult.rows,
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
      console.error("Get items shared by me error:", error);
      res
        .status(500)
        .json({ message: "Server error fetching items shared by me" });
    }
  }
);

// Share an item with another user
router.post(
  "/",
  [
    body("resourceType").isIn(["contact", "activity", "deal"]),
    body("resourceId").isInt({ min: 1 }),
    body("sharedWithUserId").isInt({ min: 1 }),
    body("permission").optional().isIn(["view", "edit"]),
    body("message").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        resourceType,
        resourceId,
        sharedWithUserId,
        permission = "view",
        message,
      } = req.body;

      // Verify the user exists
      const userCheck = await db.query("SELECT id FROM users WHERE id = $1", [
        sharedWithUserId,
      ]);

      if (userCheck.rows.length === 0) {
        return res
          .status(400)
          .json({ message: "User to share with not found" });
      }

      // Verify the resource exists and belongs to the current user
      let resourceTable;
      switch (resourceType) {
        case "contact":
          resourceTable = "contacts";
          break;
        case "activity":
          resourceTable = "activities";
          break;
        case "deal":
          resourceTable = "deals";
          break;
      }

      const resourceCheck = await db.query(
        `SELECT id FROM ${resourceTable} WHERE id = $1 AND user_id = $2`,
        [resourceId, req.user.id]
      );

      if (resourceCheck.rows.length === 0) {
        return res
          .status(404)
          .json({
            message: `${resourceType} not found or you don't have permission to share it`,
          });
      }

      // Check if already shared with this user
      const existingShare = await db.query(
        "SELECT id FROM shares WHERE shared_with = $1 AND resource_type = $2 AND resource_id = $3",
        [sharedWithUserId, resourceType, resourceId]
      );

      if (existingShare.rows.length > 0) {
        return res
          .status(400)
          .json({
            message: `${resourceType} is already shared with this user`,
          });
      }

      // Create the share
      const result = await db.query(
        `INSERT INTO shares (shared_by, shared_with, resource_type, resource_id, permission, message)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          req.user.id,
          sharedWithUserId,
          resourceType,
          resourceId,
          permission,
          message,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Share item error:", error);
      res.status(500).json({ message: "Server error sharing item" });
    }
  }
);

// Update share permissions
router.put(
  "/:id",
  [
    body("permission").isIn(["view", "edit"]),
    body("message").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { permission, message } = req.body;

      // Check if share exists and belongs to current user
      const shareCheck = await db.query(
        "SELECT id FROM shares WHERE id = $1 AND shared_by = $2",
        [id, req.user.id]
      );

      if (shareCheck.rows.length === 0) {
        return res
          .status(404)
          .json({
            message:
              "Share not found or you don't have permission to modify it",
          });
      }

      // Update the share
      const result = await db.query(
        "UPDATE shares SET permission = $1, message = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
        [permission, message, id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update share error:", error);
      res.status(500).json({ message: "Server error updating share" });
    }
  }
);

// Remove a share
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if share exists and belongs to current user
    const result = await db.query(
      "DELETE FROM shares WHERE id = $1 AND shared_by = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({
          message: "Share not found or you don't have permission to remove it",
        });
    }

    res.json({ message: "Share removed successfully" });
  } catch (error) {
    console.error("Remove share error:", error);
    res.status(500).json({ message: "Server error removing share" });
  }
});

// Get all shares (both directions) - used by frontend SharedItems component
router.get(
  "/",
  [
    query("resource_type").optional().isIn(["contact", "activity", "deal"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
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
      const { resource_type } = req.query;

      let whereClause = "WHERE (s.shared_with = $1 OR s.shared_by = $1)";
      const params = [req.user.id];
      let paramCount = 2;

      if (resource_type) {
        whereClause += ` AND s.resource_type = $${paramCount}`;
        params.push(resource_type);
        paramCount++;
      }

      const query = `
        SELECT 
          s.*,
          u_shared_by.first_name as shared_by_first_name,
          u_shared_by.last_name as shared_by_last_name,
          u_shared_by.email as shared_by_email,
          u_shared_with.first_name as shared_with_first_name,
          u_shared_with.last_name as shared_with_last_name,
          u_shared_with.email as shared_with_email,
          CASE 
            WHEN s.resource_type = 'contact' THEN 
              (SELECT row_to_json(c) FROM (
                SELECT id, first_name, last_name, email, phone, position, status
                FROM contacts WHERE id = s.resource_id
              ) c)
            WHEN s.resource_type = 'activity' THEN 
              (SELECT row_to_json(a) FROM (
                SELECT id, type, subject, description, due_date, completed as status
                FROM activities WHERE id = s.resource_id
              ) a)
            WHEN s.resource_type = 'deal' THEN 
              (SELECT row_to_json(d) FROM (
                SELECT id, title, value, currency, probability, stage_id, contact_id, company_id
                FROM deals WHERE id = s.resource_id
              ) d)
          END as resource_data
        FROM shares s
        LEFT JOIN users u_shared_by ON s.shared_by = u_shared_by.id
        LEFT JOIN users u_shared_with ON s.shared_with = u_shared_with.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(limit, offset);

      const result = await db.query(query, params);

      // Map data to include computed properties for frontend
      const shares = result.rows.map((share) => ({
        ...share,
        resourceType: share.resource_type,
        resourceId: share.resource_id,
        createdAt: share.created_at,
        sharedWithFirstName: share.shared_with_first_name,
        sharedWithLastName: share.shared_with_last_name,
        ownerFirstName: share.shared_by_first_name,
        ownerLastName: share.shared_by_last_name,
        isSharedWithMe: share.shared_with === req.user.id,
        resourceTitle: share.resource_data
          ? share.resource_type === "contact"
            ? `${share.resource_data.first_name} ${share.resource_data.last_name}`
            : share.resource_type === "activity"
            ? share.resource_data.subject || share.resource_data.type
            : share.resource_type === "deal"
            ? share.resource_data.title
            : "Unknown"
          : `${share.resource_type} #${share.resource_id}`,
      }));

      res.json(shares);
    } catch (error) {
      console.error("Get all shares error:", error);
      res.status(500).json({ message: "Server error fetching shares" });
    }
  }
);

// Get users available for sharing (exclude current user)
router.get("/users", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, first_name, last_name, email FROM users WHERE id != $1 ORDER BY first_name, last_name",
      [req.user.id]
    );

    // Map to camelCase for frontend consistency
    const users = result.rows.map((user) => ({
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
    }));

    res.json(users);
  } catch (error) {
    console.error("Get users for sharing error:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

module.exports = router;
