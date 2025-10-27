const express = require("express");
const { body, validationResult, query } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all organizations with pagination and search
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().trim(),
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
      const search = req.query.search;

      let countQuery = "SELECT COUNT(*) FROM companies";
      let dataQuery = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contact_count,
        (SELECT COUNT(*) FROM deals WHERE company_id = c.id) as deal_count
      FROM companies c 
    `;
      const params = [];

      if (search) {
        const searchCondition = `WHERE (
        c.name ILIKE $1 OR 
        c.industry ILIKE $1 OR 
        c.email ILIKE $1 OR 
        c.website ILIKE $1
      )`;
        countQuery += " " + searchCondition;
        dataQuery += " " + searchCondition;
        params.push(`%${search}%`);
      }

      dataQuery +=
        " ORDER BY c.created_at DESC LIMIT $" +
        (params.length + 1) +
        " OFFSET $" +
        (params.length + 2);
      params.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, search ? [`%${search}%`] : []),
        db.query(dataQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      res.json({
        organizations: dataResult.rows,
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
      console.error("Get organizations error:", error);
      res.status(500).json({ message: "Server error fetching organizations" });
    }
  }
);

// Get single organization with contacts and deals
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [companyResult, contactsResult, dealsResult] = await Promise.all([
      db.query("SELECT * FROM companies WHERE id = $1", [id]),
      db.query(
        "SELECT * FROM contacts WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC",
        [id, req.user.id]
      ),
      db.query(
        `
        SELECT d.*, ds.name as stage_name 
        FROM deals d 
        LEFT JOIN deal_stages ds ON d.stage_id = ds.id 
        WHERE d.company_id = $1 AND d.user_id = $2 
        ORDER BY d.created_at DESC
      `,
        [id, req.user.id]
      ),
    ]);

    if (companyResult.rows.length === 0) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.json({
      ...companyResult.rows[0],
      contacts: contactsResult.rows,
      deals: dealsResult.rows,
    });
  } catch (error) {
    console.error("Get organization error:", error);
    res.status(500).json({ message: "Server error fetching organization" });
  }
});

// Create organization
router.post(
  "/",
  [
    body("name").trim().notEmpty(),
    body("industry").optional().trim(),
    body("website").optional().isURL(),
    body("phone").optional().trim(),
    body("email").optional().isEmail().normalizeEmail(),
    body("address").optional().trim(),
    body("notes").optional().trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, industry, website, phone, email, address, notes } =
        req.body;

      const result = await db.query(
        `
      INSERT INTO companies (name, industry, website, phone, email, address, notes, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `,
        [
          name,
          industry || null,
          website || null,
          phone || null,
          email || null,
          address || null,
          notes || null,
          req.user.id,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error("Create organization error:", error);
      res.status(500).json({ message: "Server error creating organization" });
    }
  }
);

// Update organization
router.put(
  "/:id",
  [
    body("name").optional().trim().notEmpty(),
    body("industry").optional().trim(),
    body("website").optional().isURL(),
    body("phone").optional().trim(),
    body("email").optional().isEmail().normalizeEmail(),
    body("address").optional().trim(),
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

      // Check if organization exists and belongs to user
      const existingCompany = await db.query(
        "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (existingCompany.rows.length === 0) {
        return res.status(404).json({ message: "Organization not found" });
      }

      // Build dynamic update query
      const fields = [];
      const values = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      fields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id, req.user.id);

      const query = `
      UPDATE companies 
      SET ${fields.join(", ")} 
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
      RETURNING *
    `;

      const result = await db.query(query, values);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update organization error:", error);
      res.status(500).json({ message: "Server error updating organization" });
    }
  }
);

// Delete organization
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM companies WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Organization not found" });
    }

    res.json({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Delete organization error:", error);
    res.status(500).json({ message: "Server error deleting organization" });
  }
});

module.exports = router;
