import express, { Response } from "express";
import { body, validationResult, query } from "express-validator";
import db from "../config/database";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest, Activity } from "../types";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

interface ActivityRow extends Activity {
  contact_name?: string;
  company_name?: string;
  deal_title?: string;
  is_shared_with_me?: boolean;
  permission?: string;
}

interface CountRow {
  count: string;
}

interface ActivitiesQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  completed?: boolean;
  contactId?: number;
  companyId?: number;
  dealId?: number;
}

interface CreateActivityBody {
  type: "call" | "email" | "meeting" | "note" | "task";
  subject: string;
  description?: string;
  dueDate?: string;
  contactId?: number;
  companyId?: number;
  dealId?: number;
}

interface UpdateActivityBody {
  type?: "call" | "email" | "meeting" | "note" | "task";
  subject?: string;
  description?: string;
  dueDate?: string;
  completed?: boolean;
  contactId?: number;
  companyId?: number;
  dealId?: number;
}

interface ValidationRow {
  id: string;
}

interface ExistingActivityRow {
  id: string;
  user_id: string;
  permission?: string;
}

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
  async (
    req: AuthenticatedRequest<{}, {}, {}, ActivitiesQueryParams>,
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
      const { search, type, completed, contactId, companyId, dealId } =
        req.query;

      let countQuery = `
        SELECT COUNT(*) 
        FROM activities a 
        LEFT JOIN shares s ON s.item_type = 'activity' AND s.item_id = a.id AND s.shared_with_user_id = $1
        WHERE (a.user_id = $1 OR s.id IS NOT NULL)
      `;

      let dataQuery = `
        SELECT a.*, 
          c.first_name || ' ' || c.last_name as contact_name,
          comp.name as company_name,
          d.title as deal_name
        FROM activities a 
        LEFT JOIN contacts c ON a.contact_id = c.id
        LEFT JOIN companies comp ON a.company_id = comp.id
        LEFT JOIN deals d ON a.deal_id = d.id
        LEFT JOIN shares s ON s.item_type = 'activity' AND s.item_id = a.id AND s.shared_with_user_id = $1
        WHERE (a.user_id = $1 OR s.id IS NOT NULL)
      `;

      const params: any[] = [req.user.userId];
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
        db.query<CountRow>(countQuery, countParams),
        db.query<ActivityRow>(dataQuery, dataParams),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
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
router.get("/upcoming", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const result = await db.query<ActivityRow>(
      `SELECT a.*, 
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
      LIMIT 10`,
      [req.user.userId]
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
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { id } = req.params;

    const result = await db.query<ActivityRow>(
      `SELECT a.*, 
        c.first_name || ' ' || c.last_name as contact_name,
        comp.name as company_name,
        d.title as deal_title,
        CASE WHEN a.user_id = $2 THEN false ELSE true END as is_shared_with_me,
        s.permission
      FROM activities a 
      LEFT JOIN contacts c ON a.contact_id = c.id
      LEFT JOIN companies comp ON a.company_id = comp.id
      LEFT JOIN deals d ON a.deal_id = d.id
      LEFT JOIN shares s ON s.item_type = 'activity' AND s.item_id = a.id AND s.shared_with_user_id = $2
      WHERE a.id = $1 AND (a.user_id = $2 OR s.id IS NOT NULL)`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "Activity not found" });
      return;
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
  async (
    req: AuthenticatedRequest<{}, {}, CreateActivityBody>,
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
        type,
        subject,
        description,
        dueDate,
        contactId,
        companyId,
        dealId,
      } = req.body;

      // Validate foreign keys belong to user or are shared with user
      if (contactId) {
        const contactCheck = await db.query<ValidationRow>(
          `SELECT c.id FROM contacts c 
           LEFT JOIN shares s ON s.item_type = 'contact' AND s.item_id = c.id AND s.shared_with_user_id = $2
           WHERE c.id = $1 AND (c.user_id = $2 OR s.id IS NOT NULL)`,
          [contactId, req.user.userId]
        );
        if (contactCheck.rows.length === 0) {
          res.status(400).json({ message: "Invalid contact ID" });
          return;
        }
      }

      if (companyId) {
        const companyCheck = await db.query<ValidationRow>(
          "SELECT id FROM companies WHERE id = $1",
          [companyId]
        );
        if (companyCheck.rows.length === 0) {
          res.status(400).json({ message: "Invalid organization ID" });
          return;
        }
      }

      if (dealId) {
        const dealCheck = await db.query<ValidationRow>(
          `SELECT d.id FROM deals d 
           LEFT JOIN shares s ON s.item_type = 'deal' AND s.item_id = d.id AND s.shared_with_user_id = $2
           WHERE d.id = $1 AND (d.user_id = $2 OR s.id IS NOT NULL)`,
          [dealId, req.user.userId]
        );
        if (dealCheck.rows.length === 0) {
          res.status(400).json({ message: "Invalid deal ID" });
          return;
        }
      }

      const result = await db.query<Activity>(
        `INSERT INTO activities (
          type, subject, description, due_date, contact_id, company_id, deal_id, user_id
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
        RETURNING *`,
        [
          type,
          subject,
          description || null,
          dueDate || null,
          contactId || null,
          companyId || null,
          dealId || null,
          req.user.userId,
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
  async (
    req: AuthenticatedRequest<{ id: string }, {}, UpdateActivityBody>,
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

      // Check if activity exists and user has edit permission
      const existingActivity = await db.query<ExistingActivityRow>(
        `SELECT a.id, a.user_id, s.permissions as permission 
         FROM activities a 
         LEFT JOIN shares s ON s.item_type = 'activity' AND s.item_id = a.id AND s.shared_with_user_id = $2
         WHERE a.id = $1 AND (a.user_id = $2 OR s.id IS NOT NULL)`,
        [id, req.user.userId]
      );

      if (existingActivity.rows.length === 0) {
        res.status(404).json({ message: "Activity not found" });
        return;
      }

      const activityPermissions = existingActivity.rows[0];
      // Check if user is owner or has edit permission
      if (
        activityPermissions.user_id !== req.user.userId &&
        activityPermissions.permission !== "edit"
      ) {
        res
          .status(403)
          .json({ message: "You don't have permission to edit this activity" });
        return;
      }

      // Validate foreign keys
      if (updates.contactId) {
        const contactCheck = await db.query<ValidationRow>(
          `SELECT c.id FROM contacts c 
           LEFT JOIN shares s ON s.item_type = 'contact' AND s.item_id = c.id AND s.shared_with_user_id = $2
           WHERE c.id = $1 AND (c.user_id = $2 OR s.id IS NOT NULL)`,
          [updates.contactId, req.user.userId]
        );
        if (contactCheck.rows.length === 0) {
          res.status(400).json({ message: "Invalid contact ID" });
          return;
        }
      }

      if (updates.companyId) {
        const companyCheck = await db.query<ValidationRow>(
          "SELECT id FROM companies WHERE id = $1",
          [updates.companyId]
        );
        if (companyCheck.rows.length === 0) {
          res.status(400).json({ message: "Invalid organization ID" });
          return;
        }
      }

      if (updates.dealId) {
        const dealCheck = await db.query<ValidationRow>(
          `SELECT d.id FROM deals d 
           LEFT JOIN shares s ON s.item_type = 'deal' AND s.item_id = d.id AND s.shared_with_user_id = $2
           WHERE d.id = $1 AND (d.user_id = $2 OR s.id IS NOT NULL)`,
          [updates.dealId, req.user.userId]
        );
        if (dealCheck.rows.length === 0) {
          res.status(400).json({ message: "Invalid deal ID" });
          return;
        }
      }

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
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
        res.status(400).json({ message: "No valid fields to update" });
        return;
      }

      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(id);

      const query = `
        UPDATE activities 
        SET ${fields.join(", ")} 
        WHERE id = $${paramCount} 
        RETURNING *
      `;

      const result = await db.query<Activity>(query, values);
      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update activity error:", error);
      res.status(500).json({ message: "Server error updating activity" });
    }
  }
);

// Mark activity as complete/incomplete
router.patch(
  "/:id/toggle-complete",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "User not authenticated" });
        return;
      }

      const { id } = req.params;

      const result = await db.query<Activity>(
        `UPDATE activities 
       SET completed = NOT completed, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
        [id, req.user.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Activity not found" });
        return;
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Toggle activity complete error:", error);
      res.status(500).json({ message: "Server error updating activity" });
    }
  }
);

// Delete activity
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { id } = req.params;

    // Only allow owner to delete (not shared users)
    const result = await db.query<{ id: string }>(
      "DELETE FROM activities WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: "Activity not found or you don't have permission to delete it",
      });
      return;
    }

    res.json({ message: "Activity deleted successfully" });
  } catch (error) {
    console.error("Delete activity error:", error);
    res.status(500).json({ message: "Server error deleting activity" });
  }
});

export default router;
