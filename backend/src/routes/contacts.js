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
    query("status").optional().isIn(["hot", "warm", "cold", "all_good"]),
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
      const status = req.query.status;

      let countQuery = `
      SELECT COUNT(*) 
      FROM contacts c 
      LEFT JOIN companies comp ON c.company_id = comp.id 
      LEFT JOIN shares s ON s.resource_type = 'contact' AND s.resource_id = c.id AND s.shared_with = $1
      WHERE (c.user_id = $1 OR s.id IS NOT NULL)
    `;
      let dataQuery = `
      SELECT c.*, comp.name as company_name,
             CASE WHEN c.user_id = $1 THEN false ELSE true END as is_shared_with_me,
             s.permission
      FROM contacts c 
      LEFT JOIN companies comp ON c.company_id = comp.id 
      LEFT JOIN shares s ON s.resource_type = 'contact' AND s.resource_id = c.id AND s.shared_with = $1
      WHERE (c.user_id = $1 OR s.id IS NOT NULL)
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
        countQuery += searchCondition;
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

      if (status) {
        const statusCondition = `AND c.status = $${params.length + 1}`;
        countQuery += statusCondition;
        dataQuery += statusCondition;
        params.push(status);
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
        status: contact.status || "all_good",
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
      SELECT c.*, comp.name as company_name,
             CASE WHEN c.user_id = $2 THEN false ELSE true END as is_shared_with_me,
             s.permission
      FROM contacts c 
      LEFT JOIN companies comp ON c.company_id = comp.id 
      LEFT JOIN shares s ON s.resource_type = 'contact' AND s.resource_id = c.id AND s.shared_with = $2
      WHERE c.id = $1 AND (c.user_id = $2 OR s.id IS NOT NULL)
    `,
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Contact not found" });
    }

    const foundContact = result.rows[0];
    res.json({
      id: foundContact.id,
      firstName: foundContact.first_name,
      lastName: foundContact.last_name,
      email: foundContact.email,
      phone: foundContact.phone,
      position: foundContact.position,
      companyId: foundContact.company_id,
      notes: foundContact.notes,
      tags: foundContact.tags || [],
      status: foundContact.status || "all_good",
      created_at: foundContact.created_at,
      updated_at: foundContact.updated_at,
      company_name: foundContact.company_name,
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
    body("status").optional().isIn(["hot", "warm", "cold", "all_good"]),
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
        status,
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
      INSERT INTO contacts (first_name, last_name, email, phone, position, company_id, notes, tags, status, user_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
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
          status || "all_good",
          req.user.id,
        ]
      );

      const newContact = result.rows[0];
      res.status(201).json({
        id: newContact.id,
        firstName: newContact.first_name,
        lastName: newContact.last_name,
        email: newContact.email,
        phone: newContact.phone,
        position: newContact.position,
        companyId: newContact.company_id,
        notes: newContact.notes,
        tags: newContact.tags || [],
        status: newContact.status || "all_good",
        created_at: newContact.created_at,
        updated_at: newContact.updated_at,
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
    body("status").optional().isIn(["hot", "warm", "cold", "all_good"]),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const updates = req.body;

      // Check if contact exists and user has edit permission
      const existingContact = await db.query(
        `SELECT c.id, c.user_id, s.permission 
         FROM contacts c 
         LEFT JOIN shares s ON s.resource_type = 'contact' AND s.resource_id = c.id AND s.shared_with = $2
         WHERE c.id = $1 AND (c.user_id = $2 OR s.id IS NOT NULL)`,
        [id, req.user.id]
      );

      if (existingContact.rows.length === 0) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const contactPermissions = existingContact.rows[0];
      // Check if user is owner or has edit permission
      if (
        contactPermissions.user_id !== req.user.id &&
        contactPermissions.permission !== "edit"
      ) {
        return res
          .status(403)
          .json({ message: "You don't have permission to edit this contact" });
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
      values.push(id);

      const query = `
      UPDATE contacts 
      SET ${fields.join(", ")} 
      WHERE id = $${paramCount} 
      RETURNING *
    `;

      const result = await db.query(query, values);
      const updatedContact = result.rows[0];

      if (!updatedContact) {
        return res
          .status(404)
          .json({ message: "Contact not found or could not be updated" });
      }
      res.json({
        id: updatedContact.id,
        firstName: updatedContact.first_name,
        lastName: updatedContact.last_name,
        email: updatedContact.email,
        phone: updatedContact.phone,
        position: updatedContact.position,
        companyId: updatedContact.company_id,
        notes: updatedContact.notes,
        tags: updatedContact.tags || [],
        status: updatedContact.status || "all_good",
        created_at: updatedContact.created_at,
        updated_at: updatedContact.updated_at,
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

    // Only allow owner to delete (not shared users)
    const result = await db.query(
      "DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Contact not found or you don't have permission to delete it",
      });
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
