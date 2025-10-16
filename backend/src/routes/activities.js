const express = require("express");
const { body, validationResult, query } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all activities with pagination and filtering
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().trim(),
    query("type").optional().trim(),
    query("completed").optional().isBoolean(),
    query("contactId").optional().isInt(),
    query("companyId").optional().isInt(),
    query("dealId").optional().isInt(),
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
      const { search, type, completed, contactId, companyId, dealId } =
        req.query;

      let countQuery = "SELECT COUNT(*) FROM activities a WHERE a.user_id = $1";
      let dataQuery = `
      SELECT a.*, 
        c.first_name || ' ' || c.last_name as contact_name,
        comp.name as company_name,
        d.title as deal_title
      FROM activities a 
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN companies comp ON a.company_id = comp.id
      LEFT JOIN deals d ON a.deal_id = d.id
      WHERE a.user_id = $1
    `;
      const params = [req.user.id];
      let paramCount = 2;

      // Add search filter
      if (search) {
        const searchCondition = `AND (
          a.subject ILIKE $${paramCount} OR 
          a.description ILIKE $${paramCount} OR 
          a.type ILIKE $${paramCount}
        )`;
        countQuery += searchCondition;
        dataQuery += searchCondition;
        params.push(`%${search}%`);
        paramCount++;
      }

      // Add filters
      if (type) {
        const typeCondition = `AND a.type = $${paramCount}`;
        countQuery += typeCondition;
        dataQuery += typeCondition;
        params.push(type);
        paramCount++;
      }

      if (completed !== undefined) {
        const completedCondition = `AND a.completed = $${paramCount}`;
        countQuery += completedCondition;
        dataQuery += completedCondition;
        params.push(completed);
        paramCount++;
      }

      if (contactId) {
        const contactCondition = `AND a.contact_id = $${paramCount}`;
        countQuery += contactCondition;
        dataQuery += contactCondition;
        params.push(contactId);
        paramCount++;
      }

      if (companyId) {
        const companyCondition = `AND a.company_id = $${paramCount}`;
        countQuery += companyCondition;
        dataQuery += companyCondition;
        params.push(companyId);
        paramCount++;
      }

      if (dealId) {
        const dealCondition = `AND a.deal_id = $${paramCount}`;
        countQuery += dealCondition;
        dataQuery += dealCondition;
        params.push(dealId);
        paramCount++;
      }

      dataQuery += ` ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC LIMIT $${paramCount} OFFSET $${
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

      res.json({
        activities: dataResult.rows,
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
      console.error("Get activities error:", error);
      res.status(500).json({ message: "Server error fetching activities" });
    }
  }
);

// Get upcoming activities (dashboard)
router.get("/upcoming", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT a.*, 
        c.first_name || ' ' || c.last_name as contact_name,
        comp.name as company_name,
        d.title as deal_title
      FROM activities a 
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN companies comp ON a.company_id = comp.id
      LEFT JOIN deals d ON a.deal_id = d.id
      WHERE a.user_id = $1 AND a.completed = false 
        AND (a.due_date IS NULL OR a.due_date >= CURRENT_DATE)
      ORDER BY a.due_date ASC NULLS LAST, a.created_at DESC
      LIMIT 10
    `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Get upcoming activities error:", error);
    res
      .status(500)
      .json({ message: "Server error fetching upcoming activities" });
  }
});

// Get single activity
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT a.*, 
        c.first_name || ' ' || c.last_name as contact_name,
        comp.name as company_name,
        d.title as deal_title
      FROM activities a 
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN companies comp ON a.company_id = comp.id
      LEFT JOIN deals d ON a.deal_id = d.id
      WHERE a.id = $1 AND a.user_id = $2
    `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get activity error:", error);
    res.status(500).json({ message: "Server error fetching activity" });
  }
});

// Create activity
router.post(
  "/",
  [
    body("type").isIn(["call", "email", "meeting", "note", "task"]),
    body("subject").trim().notEmpty(),
    body("description").optional().trim(),
    body("dueDate").optional().isISO8601(),
    body("contactId").optional().isInt(),
    body("companyId").optional().isInt(),
    body("dealId").optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        type,
        subject,
        description,
        dueDate,
        contactId,
        companyId,
        dealId,
      } = req.body;

      // Validate foreign keys belong to user
      if (contactId) {
        const contactCheck = await db.query(
          "SELECT id FROM contacts WHERE id = $1 AND user_id = $2",
          [contactId, req.user.id]
        );
        if (contactCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid contact ID" });
        }
      }

      if (companyId) {
        const companyCheck = await db.query(
          "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
          [companyId, req.user.id]
        );
        if (companyCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid company ID" });
        }
      }

      if (dealId) {
        const dealCheck = await db.query(
          "SELECT id FROM deals WHERE id = $1 AND user_id = $2",
          [dealId, req.user.id]
        );
        if (dealCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid deal ID" });
        }
      }

      const result = await db.query(
        `
      INSERT INTO activities (
        type, subject, description, due_date, contact_id, company_id, deal_id, user_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `,
        [
          type,
          subject,
          description || null,
          dueDate || null,
          contactId || null,
          companyId || null,
          dealId || null,
          req.user.id,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create activity error:", error);
      res.status(500).json({ message: "Server error creating activity" });
    }
  }
);

// Update activity
router.put(
  "/:id",
  [
    body("type").optional().isIn(["call", "email", "meeting", "note", "task"]),
    body("subject").optional().trim().notEmpty(),
    body("description").optional().trim(),
    body("dueDate").optional().isISO8601(),
    body("completed").optional().isBoolean(),
    body("contactId").optional().isInt(),
    body("companyId").optional().isInt(),
    body("dealId").optional().isInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      // Check if activity exists and belongs to user
      const existingActivity = await db.query(
        "SELECT id FROM activities WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (existingActivity.rows.length === 0) {
        return res.status(404).json({ message: "Activity not found" });
      }

      // Validate foreign keys
      if (updates.contactId) {
        const contactCheck = await db.query(
          "SELECT id FROM contacts WHERE id = $1 AND user_id = $2",
          [updates.contactId, req.user.id]
        );
        if (contactCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid contact ID" });
        }
      }

      if (updates.companyId) {
        const companyCheck = await db.query(
          "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
          [updates.companyId, req.user.id]
        );
        if (companyCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid company ID" });
        }
      }

      if (updates.dealId) {
        const dealCheck = await db.query(
          "SELECT id FROM deals WHERE id = $1 AND user_id = $2",
          [updates.dealId, req.user.id]
        );
        if (dealCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid deal ID" });
        }
      }

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        const dbField =
          key === "dueDate"
            ? "due_date"
            : key === "contactId"
            ? "contact_id"
            : key === "companyId"
            ? "company_id"
            : key === "dealId"
            ? "deal_id"
            : key;
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id, req.user.id);

      const query = `
      UPDATE activities 
      SET ${fields.join(", ")} 
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
      RETURNING *
    `;

      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update activity error:", error);
      res.status(500).json({ message: "Server error updating activity" });
    }
  }
);

// Mark activity as complete/incomplete
router.patch("/:id/toggle-complete", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      UPDATE activities 
      SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2 
      RETURNING *
    `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Toggle activity complete error:", error);
    res.status(500).json({ message: "Server error updating activity" });
  }
});

// Delete activity
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM activities WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Activity not found" });
    }

    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Delete activity error:", error);
    res.status(500).json({ message: "Server error deleting activity" });
  }
});

module.exports = router;
