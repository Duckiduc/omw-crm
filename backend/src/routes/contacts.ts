import express, { Response } from "express";
import { body, validationResult, query } from "express-validator";
import db from "../config/database";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest, Contact } from "../types";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

interface ContactsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  tags?: string;
  status?: string;
}

interface ContactRow extends Contact {
  company_name?: string;
  is_shared_with_me: boolean;
  permissions?: string;
}

interface CountRow {
  count: string;
}

interface CreateContactBody {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  position?: string;
  companyId?: string;
  notes?: string;
  tags?: string[];
  status?: string;
}

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
  async (
    req: AuthenticatedRequest<{}, {}, {}, ContactsQueryParams>,
    res: Response
  ) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
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

      const params: any[] = [req.user.userId];

      if (search) {
        const searchCondition = ` AND (
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
        const tagCondition = ` AND c.tags && $${params.length + 1}`;
        countQuery += tagCondition;
        dataQuery += tagCondition;
        const tagArray = tags
          .split(",")
          .map((tag: string) => tag.trim())
          .filter(Boolean);
        params.push(tagArray);
      }

      if (status) {
        const statusCondition = ` AND c.status = $${params.length + 1}`;
        countQuery += statusCondition;
        dataQuery += statusCondition;
        params.push(status);
      }

      dataQuery += ` ORDER BY c.created_at DESC LIMIT $${
        params.length + 1
      } OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const [countResult, dataResult] = await Promise.all([
        db.query<CountRow>(countQuery, params.slice(0, -2)),
        db.query<ContactRow>(dataQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(total / limit);

      // Transform to camelCase for frontend compatibility
      const contacts = dataResult.rows.map((contact) => ({
        id: contact.id,
        firstName: contact.first_name,
        lastName: contact.last_name,
        email: contact.email,
        phone: contact.phone,
        position: contact.position,
        companyId: contact.company_id,
        companyName: contact.company_name,
        notes: contact.notes,
        tags: contact.tags || [],
        status: contact.status,
        isSharedWithMe: contact.is_shared_with_me,
        permission: contact.permissions,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at,
        userId: contact.user_id,
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

// Create a new contact
router.post(
  "/",
  [
    body("firstName").trim().notEmpty().withMessage("First name is required"),
    body("lastName").trim().notEmpty().withMessage("Last name is required"),
    body("email").optional().isEmail().normalizeEmail(),
    body("phone").optional().trim(),
    body("position").optional().trim(),
    body("companyId").optional().isInt(),
    body("notes").optional().trim(),
    body("tags").optional().isArray(),
    body("status")
      .optional()
      .isIn(["hot", "warm", "cold", "all_good"])
      .withMessage("Invalid status"),
  ],
  async (
    req: AuthenticatedRequest<{}, {}, CreateContactBody>,
    res: Response
  ) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
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
        status = "all_good",
      } = req.body;

      // If companyId provided, verify it belongs to user
      if (companyId) {
        const companyCheck = await db.query<{ id: string }>(
          "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
          [companyId, req.user.userId]
        );
        if (companyCheck.rows.length === 0) {
          res.status(400).json({ message: "Invalid company ID" });
          return;
        }
      }

      // Process tags - filter out empty strings and duplicates
      const processedTags = tags
        ? [...new Set(tags.filter((tag: string) => tag && tag.trim()))]
        : [];

      const result = await db.query<Contact>(
        `INSERT INTO contacts 
         (first_name, last_name, email, phone, position, company_id, notes, tags, status, user_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
         RETURNING *`,
        [
          firstName,
          lastName,
          email || null,
          phone || null,
          position || null,
          companyId || null,
          notes || null,
          processedTags,
          status,
          req.user.userId,
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

// Get a specific contact
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const contactId = req.params.id;

    const result = await db.query<ContactRow>(
      `SELECT c.*, comp.name as company_name,
              CASE WHEN c.user_id = $1 THEN false ELSE true END as is_shared_with_me,
              s.permission
       FROM contacts c 
       LEFT JOIN companies comp ON c.company_id = comp.id 
       LEFT JOIN shares s ON s.resource_type = 'contact' AND s.resource_id = c.id AND s.shared_with = $1
       WHERE c.id = $2 AND (c.user_id = $1 OR s.id IS NOT NULL)`,
      [req.user.userId, contactId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Contact not found" });
      return;
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
      status: contact.status || "all_good",
      created_at: contact.created_at,
      updated_at: contact.updated_at,
      company_name: contact.company_name,
    });
  } catch (error) {
    console.error("Get contact error:", error);
    res.status(500).json({ message: "Server error fetching contact" });
  }
});

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
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const { id } = req.params;
      const updates = req.body;

      // Check if contact exists and user has edit permission
      const existingContact = await db.query<{
        id: string;
        user_id: string;
        permission?: string;
      }>(
        `SELECT c.id, c.user_id, s.permission 
         FROM contacts c 
         LEFT JOIN shares s ON s.resource_type = 'contact' AND s.resource_id = c.id AND s.shared_with = $2
         WHERE c.id = $1 AND (c.user_id = $2 OR s.id IS NOT NULL)`,
        [id, req.user.userId]
      );

      if (existingContact.rows.length === 0) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }

      const contactPermissions = existingContact.rows[0];
      // Check if user is owner or has edit permission
      if (
        contactPermissions.user_id !== req.user.userId &&
        contactPermissions.permission !== "edit"
      ) {
        res
          .status(403)
          .json({ message: "You don't have permission to edit this contact" });
        return;
      }

      // If companyId provided, verify it belongs to user
      if (updates.companyId) {
        const companyCheck = await db.query<{ id: string }>(
          "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
          [updates.companyId, req.user.userId]
        );
        if (companyCheck.rows.length === 0) {
          res.status(400).json({ message: "Invalid company ID" });
          return;
        }
      }

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        if (key === "tags") {
          // Process tags - filter out empty strings and duplicates
          const processedTags = Array.isArray(value)
            ? [...new Set((value as string[]).filter((tag) => tag && tag.trim()))]
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
        res.status(400).json({ message: "No valid fields to update" });
        return;
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      const query = `
        UPDATE contacts 
        SET ${fields.join(", ")} 
        WHERE id = $${paramCount} 
        RETURNING *
      `;

      const result = await db.query<Contact>(query, values);
      const updatedContact = result.rows[0];

      if (!updatedContact) {
        res
          .status(404)
          .json({ message: "Contact not found or could not be updated" });
        return;
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
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { id } = req.params;

    // Only allow owner to delete (not shared users)
    const result = await db.query<{ id: string }>(
      "DELETE FROM contacts WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: "Contact not found or you don't have permission to delete it",
      });
      return;
    }

    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    console.error("Delete contact error:", error);
    res.status(500).json({ message: "Server error deleting contact" });
  }
});

// Get all unique tags for user's contacts
router.get("/tags/all", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const result = await db.query<{ tag: string }>(
      `SELECT DISTINCT unnest(tags) as tag 
      FROM contacts 
      WHERE user_id = $1 AND tags IS NOT NULL 
      ORDER BY tag`,
      [req.user.userId]
    );

    const tags = result.rows.map((row) => row.tag).filter(Boolean);
    res.json({ tags });
  } catch (error) {
    console.error("Get tags error:", error);
    res.status(500).json({ message: "Server error fetching tags" });
  }
});

export default router;
