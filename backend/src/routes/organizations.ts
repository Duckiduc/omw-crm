import express, { Response } from "express";
import { body, validationResult, query } from "express-validator";
import db from "../config/database";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest, Organization, Contact, Deal } from "../types";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

interface OrganizationWithCounts extends Organization {
  contact_count: string;
  deal_count: string;
}

interface OrganizationDetail extends Organization {
  contacts: Contact[];
  deals: (Deal & { stage_name?: string })[];
}

interface CountRow {
  count: string;
}

interface OrganizationsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

interface CreateOrganizationBody {
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface UpdateOrganizationBody {
  name?: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

// Get all organizations with pagination and search
router.get(
  "/",
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
    query("search").optional().trim(),
  ],
  async (
    req: AuthenticatedRequest<{}, {}, {}, OrganizationsQueryParams>,
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

      let countQuery = "SELECT COUNT(*) FROM companies";
      let dataQuery = `
        SELECT c.*, 
          (SELECT COUNT(*) FROM contacts WHERE company_id = c.id) as contact_count,
          (SELECT COUNT(*) FROM deals WHERE company_id = c.id) as deal_count
        FROM companies c 
      `;
      const params: any[] = [];

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
        db.query<CountRow>(countQuery, search ? [`%${search}%`] : []),
        db.query<OrganizationWithCounts>(dataQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
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
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { id } = req.params;

    const [companyResult, contactsResult, dealsResult] = await Promise.all([
      db.query<Organization>("SELECT * FROM companies WHERE id = $1", [id]),
      db.query<Contact>(
        "SELECT * FROM contacts WHERE company_id = $1 AND user_id = $2 ORDER BY created_at DESC",
        [id, req.user.userId]
      ),
      db.query<Deal & { stage_name?: string }>(
        `SELECT d.*, ds.name as stage_name 
        FROM deals d 
        LEFT JOIN deal_stages ds ON d.stage_id = ds.id 
        WHERE d.company_id = $1 AND d.user_id = $2 
        ORDER BY d.created_at DESC`,
        [id, req.user.userId]
      ),
    ]);

    if (companyResult.rows.length === 0) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    const organization: OrganizationDetail = {
      ...companyResult.rows[0],
      contacts: contactsResult.rows,
      deals: dealsResult.rows,
    };

    res.json(organization);
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
  async (
    req: AuthenticatedRequest<{}, {}, CreateOrganizationBody>,
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

      const { name, industry, website, phone, email, address, notes } =
        req.body;

      const result = await db.query<Organization>(
        `INSERT INTO companies (name, industry, website, phone, email, address, notes, user_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING *`,
        [
          name,
          industry || null,
          website || null,
          phone || null,
          email || null,
          address || null,
          notes || null,
          req.user.userId,
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
  async (
    req: AuthenticatedRequest<{ id: string }, {}, UpdateOrganizationBody>,
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

      const { id } = req.params;
      const updates = req.body;

      // Check if organization exists and belongs to user
      const existingCompany = await db.query<{ id: string }>(
        "SELECT id FROM companies WHERE id = $1 AND user_id = $2",
        [id, req.user.userId]
      );

      if (existingCompany.rows.length === 0) {
        res.status(404).json({ message: "Organization not found" });
        return;
      }

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        fields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length === 0) {
        res.status(400).json({ message: "No valid fields to update" });
        return;
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id, req.user.userId);

      const query = `
        UPDATE companies 
        SET ${fields.join(", ")} 
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
        RETURNING *
      `;

      const result = await db.query<Organization>(query, values);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update organization error:", error);
      res.status(500).json({ message: "Server error updating organization" });
    }
  }
);

// Delete organization
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { id } = req.params;

    const result = await db.query<{ id: string }>(
      "DELETE FROM companies WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Organization not found" });
      return;
    }

    res.json({ message: "Organization deleted successfully" });
  } catch (error) {
    console.error("Delete organization error:", error);
    res.status(500).json({ message: "Server error deleting organization" });
  }
});

export default router;
