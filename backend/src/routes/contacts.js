const express = require("express");
const { body, validationResult, query } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all contacts with pagination and search
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().trim(),
    query("tags").optional().trim(),
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
      const tags = req.query.tags;

      let countQuery = "SELECT COUNT(*) FROM contacts WHERE user_id = $1";
      let dataQuery = `
      SELECT c.*, comp.name as company_name 
      FROM contacts c 
      LEFT JOIN companies comp ON c.company_id = comp.id 
      WHERE c.user_id = $1
    `;
      const params = [req.user.id];

      if (search) {
        const searchCondition = `AND (
        c.first_name ILIKE $2 OR 
        c.last_name ILIKE $2 OR 
        c.email ILIKE $2 OR 
        c.phone ILIKE $2 OR 
        comp.name ILIKE $2 OR
        array_to_string(c.tags, ' ') ILIKE $2
      )`;
        countQuery += searchCondition.replace("AND", "AND");
        dataQuery += searchCondition;
        params.push(`%${search}%`);
      }

      if (tags) {
        const tagCondition = `AND c.tags && $${params.length + 1}`;
        countQuery += tagCondition;
        dataQuery += tagCondition;
        // Parse comma-separated tags into array
        const tagArray = tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean);
        params.push(tagArray);
      }

      dataQuery +=
        " ORDER BY c.created_at DESC LIMIT $" +
        (params.length + 1) +
        " OFFSET $" +
        (params.length + 2);
      params.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        db.query(countQuery, params.slice(0, -2)), // Remove limit and offset for count
        db.query(dataQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count);
      const totalPages = Math.ceil(total / limit);

      // Convert snake_case to camelCase for frontend compatibility
      const contacts = dataResult.rows.map((contact) => ({
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        companyId: contact.company_id,
        notes: contact.notes,
        tags: contact.tags || [],
        created_at: contact.created_at,
        updated_at: contact.updated_at,
        company_name: contact.company_name,
      }));

      res.json({
        contacts,
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
      console.error("Get contacts error:", error);
      res.status(500).json({ message: "Server error fetching contacts" });
    }
  }
);

// Get single contact
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `
      SELECT c.*, comp.name as company_name 
      FROM contacts c 
      LEFT JOIN companies comp ON c.company_id = comp.id 
      WHERE c.id = $1 AND c.user_id = $2
    `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }

    const contact = result.rows[0];
    res.json({
      id: contact.id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      position: contact.position,
      companyId: contact.company_id,
      notes: contact.notes,
      tags: contact.tags || [],
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      company_name: contact.company_name,
    });
  } catch (error) {
    console.error("Get contact error:", error);
    res.status(500).json({ message: "Server error fetching contact" });
  }
});

// Create contact
router.post(
  "/",
  [
    body("firstName").trim().notEmpty(),
    body("lastName").trim().notEmpty(),
    body("email").optional().isEmail().normalizeEmail(),
    body("phone").optional().trim(),
    body("position").optional().trim(),
    body("companyId").optional().isInt(),
    body("notes").optional().trim(),
    body("tags").optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        firstName,
        lastName,
        email,
        phone,
        position,
        companyId,
        notes,
        tags,
      } = req.body;

      // If companyId provided, verify it belongs to user
      if (companyId) {
        const companyCheck = await db.query(
          "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
          [companyId, req.user.id]
        );
        if (companyCheck.rows.length === 0) {
          return res.status(400).json({ message: "Invalid company ID" });
        }
      }

      // Process tags - filter out empty strings and duplicates
      const processedTags = tags
        ? [...new Set(tags.filter((tag) => tag && tag.trim()))]
        : [];

      const result = await db.query(
        `
      INSERT INTO contacts (first_name, last_name, email, phone, position, company_id, notes, tags, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING *
    `,
        [
          firstName,
          lastName,
          email || null,
          phone || null,
          position || null,
          companyId || null,
          notes || null,
          processedTags,
          req.user.id,
        ]
      );

      const contact = result.rows[0];
      res.status(201).json({
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        companyId: contact.company_id,
        notes: contact.notes,
        tags: contact.tags || [],
        created_at: contact.created_at,
        updated_at: contact.updated_at,
      });
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(500).json({ message: "Server error creating contact" });
    }
  }
);

// Update contact
router.put(
  "/:id",
  [
    body("firstName").optional().trim().notEmpty(),
    body("lastName").optional().trim().notEmpty(),
    body("email").optional().isEmail().normalizeEmail(),
    body("phone").optional().trim(),
    body("position").optional().trim(),
    body("companyId").optional().isInt(),
    body("notes").optional().trim(),
    body("tags").optional().isArray(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      // Check if contact exists and belongs to user
      const existingContact = await db.query(
        "SELECT id FROM contacts WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (existingContact.rows.length === 0) {
        return res.status(404).json({ message: "Contact not found" });
      }

      // If companyId provided, verify it belongs to user
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
        if (key === "tags") {
          // Process tags - filter out empty strings and duplicates
          const processedTags = value
            ? [...new Set(value.filter((tag) => tag && tag.trim()))]
            : [];
          fields.push(`tags = $${paramCount}`);
          values.push(processedTags);
        } else {
          const dbField =
            key === "firstName"
              ? "first_name"
              : key === "lastName"
              ? "last_name"
              : key === "companyId"
              ? "company_id"
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
      values.push(id, req.user.id);

      const query = `
      UPDATE contacts 
      SET ${fields.join(", ")} 
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
      RETURNING *
    `;

      const result = await db.query(query, values);
      const contact = result.rows[0];
      res.json({
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        companyId: contact.company_id,
        notes: contact.notes,
        tags: contact.tags || [],
        created_at: contact.created_at,
        updated_at: contact.updated_at,
      });
    } catch (error) {
      console.error("Update contact error:", error);
      res.status(500).json({ message: "Server error updating contact" });
    }
  }
);

// Delete contact
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }

    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({ message: "Server error deleting contact" });
  }
});

// Get all unique tags for user's contacts
router.get("/tags/all", async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT DISTINCT unnest(tags) as tag 
      FROM contacts 
      WHERE user_id = $1 AND tags IS NOT NULL 
      ORDER BY tag
    `,
      [req.user.id]
    );

    const tags = result.rows.map((row) => row.tag).filter(Boolean);
    res.json({ tags });
  } catch (error) {
    console.error("Get tags error:", error);
    res.status(500).json({ message: "Server error fetching tags" });
  }
});

module.exports = router;
