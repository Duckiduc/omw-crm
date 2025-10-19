const express = require("express");
const { body, validationResult, query } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get deal stages
router.get("/stages", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM deal_stages WHERE user_id = $1 ORDER BY order_index",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Get deal stages error:", error);
    res.status(500).json({ message: "Server error fetching deal stages" });
  }
});

// Get all deals with pagination and filtering
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().trim(),
    query("stageId").optional().isInt(),
    query("companyId").optional().isInt(),
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
      const { search, stageId, companyId } = req.query;

      let countQuery = `
      SELECT COUNT(*) 
      FROM deals d 
      LEFT JOIN shares s ON s.resource_type = 'deal' AND s.resource_id = d.id AND s.shared_with = $1
      WHERE (d.user_id = $1 OR s.id IS NOT NULL)
    `;
      let dataQuery = `
      SELECT d.*, 
        ds.name as stage_name,
        c.first_name || ' ' || c.last_name as contact_name,
        comp.name as company_name,
        CASE WHEN d.user_id = $1 THEN false ELSE true END as is_shared_with_me,
        s.permission
      FROM deals d 
      LEFT JOIN deal_stages ds ON d.stage_id = ds.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      LEFT JOIN shares s ON s.resource_type = 'deal' AND s.resource_id = d.id AND s.shared_with = $1
      WHERE (d.user_id = $1 OR s.id IS NOT NULL)
    `;
      const params = [req.user.id];
      let paramCount = 2;

      // Add filters
      if (search) {
        const searchCondition = `AND (d.title ILIKE $${paramCount} OR comp.name ILIKE $${paramCount})`;
        countQuery += searchCondition;
        dataQuery += searchCondition;
        params.push(`%${search}%`);
        paramCount++;
      }

      if (stageId) {
        const stageCondition = `AND d.stage_id = $${paramCount}`;
        countQuery += stageCondition;
        dataQuery += stageCondition;
        params.push(stageId);
        paramCount++;
      }

      if (companyId) {
        const companyCondition = `AND d.company_id = $${paramCount}`;
        countQuery += companyCondition;
        dataQuery += companyCondition;
        params.push(companyId);
        paramCount++;
      }

      dataQuery += ` ORDER BY d.created_at DESC LIMIT $${paramCount} OFFSET $${
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
        deals: dataResult.rows,
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
      console.error("Get deals error:", error);
      res.status(500).json({ message: "Server error fetching deals" });
    }
  }
);

// Get deals by stage (for kanban board)
router.get("/by-stage", async (req, res) => {
  try {
    const stagesResult = await db.query(
      "SELECT * FROM deal_stages WHERE user_id = $1 ORDER BY order_index",
      [req.user.id]
    );

    const dealsByStage = {};

    for (const stage of stagesResult.rows) {
      const dealsResult = await db.query(
        `
        SELECT d.*, 
          c.first_name || ' ' || c.last_name as contact_name,
          comp.name as company_name
        FROM deals d 
        LEFT JOIN contacts c ON d.contact_id = c.id
        LEFT JOIN companies comp ON d.company_id = comp.id
        WHERE d.stage_id = $1 AND d.user_id = $2
        ORDER BY d.created_at DESC
      `,
        [stage.id, req.user.id]
      );

      dealsByStage[stage.id] = {
        stage: stage,
        deals: dealsResult.rows,
      };
    }

    res.json(dealsByStage);
  } catch (error) {
    console.error("Get deals by stage error:", error);
    res.status(500).json({ message: "Server error fetching deals by stage" });
  }
});

// Get single deal
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT d.*, 
        ds.name as stage_name,
        c.first_name || ' ' || c.last_name as contact_name,
        comp.name as company_name,
        CASE WHEN d.user_id = $2 THEN false ELSE true END as is_shared_with_me,
        s.permission
      FROM deals d 
      LEFT JOIN deal_stages ds ON d.stage_id = ds.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      LEFT JOIN shares s ON s.resource_type = 'deal' AND s.resource_id = d.id AND s.shared_with = $2
      WHERE d.id = $1 AND (d.user_id = $2 OR s.id IS NOT NULL)
    `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Deal not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Get deal error:", error);
    res.status(500).json({ message: "Server error fetching deal" });
  }
});

// Create deal
router.post(
  "/",
  [
    body("title").trim().notEmpty(),
    body("value").optional().isFloat({ min: 0 }),
    body("currency").optional().isLength({ min: 3, max: 3 }),
    body("stageId").optional().isInt(),
    body("contactId").optional().isInt(),
    body("companyId").optional().isInt(),
    body("expectedCloseDate").optional().isDate(),
    body("probability").optional().isInt({ min: 0, max: 100 }),
    body("notes").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        title,
        value,
        currency,
        stageId,
        contactId,
        companyId,
        expectedCloseDate,
        probability,
        notes,
      } = req.body;

      // Validate foreign keys belong to user
      if (stageId) {
        const stageCheck = await db.query(
          "SELECT id FROM deal_stages WHERE id = $1 AND user_id = $2",
          [stageId, req.user.id]
        );
        if (stageCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid stage ID" });
        }
      }

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

      const result = await db.query(
        `
      INSERT INTO deals (
        title, value, currency, stage_id, contact_id, company_id, 
        expected_close_date, probability, notes, user_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
      RETURNING *
    `,
        [
          title,
          value || 0,
          currency || "USD",
          stageId || null,
          contactId || null,
          companyId || null,
          expectedCloseDate || null,
          probability || 0,
          notes || null,
          req.user.id,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create deal error:", error);
      res.status(500).json({ message: "Server error creating deal" });
    }
  }
);

// Update deal
router.put(
  "/:id",
  [
    body("title").optional().trim().notEmpty(),
    body("value").optional().isFloat({ min: 0 }),
    body("currency").optional().isLength({ min: 3, max: 3 }),
    body("stageId").optional().isInt(),
    body("contactId").optional().isInt(),
    body("companyId").optional().isInt(),
    body("expectedCloseDate").optional().isDate(),
    body("probability").optional().isInt({ min: 0, max: 100 }),
    body("notes").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      // Check if deal exists and user has edit permission
      const existingDeal = await db.query(
        `SELECT d.id, d.user_id, s.permission 
         FROM deals d 
         LEFT JOIN shares s ON s.resource_type = 'deal' AND s.resource_id = d.id AND s.shared_with = $2
         WHERE d.id = $1 AND (d.user_id = $2 OR s.id IS NOT NULL)`,
        [id, req.user.id]
      );

      if (existingDeal.rows.length === 0) {
        return res.status(404).json({ message: "Deal not found" });
      }

      const dealPermissions = existingDeal.rows[0];
      // Check if user is owner or has edit permission
      if (
        dealPermissions.user_id !== req.user.id &&
        dealPermissions.permission !== "edit"
      ) {
        return res
          .status(403)
          .json({ message: "You don't have permission to edit this deal" });
      }

      // Validate foreign keys
      if (updates.stageId) {
        const stageCheck = await db.query(
          "SELECT id FROM deal_stages WHERE id = $1 AND user_id = $2",
          [updates.stageId, req.user.id]
        );
        if (stageCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid stage ID" });
        }
      }

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

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        const dbField =
          key === "stageId"
            ? "stage_id"
            : key === "contactId"
            ? "contact_id"
            : key === "companyId"
            ? "company_id"
            : key === "expectedCloseDate"
            ? "expected_close_date"
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
      UPDATE deals 
      SET ${fields.join(", ")} 
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
      RETURNING *
    `;

      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update deal error:", error);
      res.status(500).json({ message: "Server error updating deal" });
    }
  }
);

// Delete deal
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Only allow owner to delete (not shared users)
    const result = await db.query(
      "DELETE FROM deals WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({
          message: "Deal not found or you don't have permission to delete it",
        });
    }

    res.json({ message: "Deal deleted successfully" });
  } catch (error) {
    console.error("Delete deal error:", error);
    res.status(500).json({ message: "Server error deleting deal" });
  }
});

module.exports = router;
