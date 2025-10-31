import express, { Response } from "express";
import { body, validationResult, query } from "express-validator";
import db from "../config/database";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest, Share } from "../types";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

interface ShareRow {
  id: string;
  shared_by_user_id: string;
  shared_with_user_id: string;
  item_type: "contact" | "activity" | "deal";
  item_id: string;
  permissions: string;
  message?: string;
  created_at: Date;
  updated_at?: Date;
  shared_by_first_name?: string;
  shared_by_last_name?: string;
  shared_by_email?: string;
  shared_with_first_name?: string;
  shared_with_last_name?: string;
  shared_with_email?: string;
  resource_data?: any;
}

interface CountRow {
  count: string;
}

interface UserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface SharesQueryParams {
  type?: "contact" | "activity" | "deal";
  resource_type?: "contact" | "activity" | "deal";
  page?: number;
  limit?: number;
}

interface CreateShareBody {
  resourceType: "contact" | "activity" | "deal";
  resourceId: number;
  sharedWithUserId: number;
  permission?: "read" | "write";
}

interface UpdateShareBody {
  permission: "read" | "write";
}

// Get all items shared with the current user
router.get(
  "/shared-with-me",
  [
    query("type").optional().isIn(["contact", "activity", "deal"]),
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  async (
    req: AuthenticatedRequest<{}, {}, {}, SharesQueryParams>,
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
      const { type } = req.query;

      let whereClause = "WHERE s.shared_with_user_id = $1";
      const params: any[] = [req.user.userId];
      let paramCount = 2;

      if (type) {
        whereClause += ` AND s.item_type = $${paramCount}`;
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
            WHEN s.item_type = 'contact' THEN 
              (SELECT json_build_object(
                'id', id, 'first_name', first_name, 'last_name', last_name, 
                'email', email, 'phone', phone, 'company_name', (SELECT name FROM companies WHERE id = contacts.company_id)
              ) FROM contacts WHERE id = s.item_id)
            WHEN s.item_type = 'activity' THEN 
              (SELECT json_build_object(
                'id', id, 'subject', subject, 'description', description, 'due_date', due_date
              ) FROM activities WHERE id = s.item_id)
            WHEN s.item_type = 'deal' THEN 
              (SELECT json_build_object(
                'id', id, 'title', title, 'value', value, 'currency', currency, 'probability', probability, 'notes', notes
              ) FROM deals WHERE id = s.item_id)
          END as resource_data
        FROM shares s
        JOIN users u ON s.shared_by_user_id = u.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const countQuery = `
        SELECT COUNT(*) FROM shares s ${whereClause}
      `;

      const [dataResult, countResult] = await Promise.all([
        db.query<ShareRow>(query, [...params, limit, offset]),
        db.query<CountRow>(countQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
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
  async (
    req: AuthenticatedRequest<{}, {}, {}, SharesQueryParams>,
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
      const { type } = req.query;

      let whereClause = "WHERE s.shared_by_user_id = $1";
      const params: any[] = [req.user.userId];
      let paramCount = 2;

      if (type) {
        whereClause += ` AND s.item_type = $${paramCount}`;
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
        JOIN users u ON s.shared_with_user_id = u.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      const countQuery = `
        SELECT COUNT(*) FROM shares s ${whereClause}
      `;

      const [dataResult, countResult] = await Promise.all([
        db.query<ShareRow>(query, [...params, limit, offset]),
        db.query<CountRow>(countQuery, params),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
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
    body("permission").optional().isIn(["read", "write"]),
  ],
  async (req: AuthenticatedRequest<{}, {}, CreateShareBody>, res: Response) => {
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
        resourceType,
        resourceId,
        sharedWithUserId,
        permission = "read",
      } = req.body;

      // Verify the user exists
      const userCheck = await db.query<{ id: string }>(
        "SELECT id FROM users WHERE id = $1",
        [sharedWithUserId]
      );

      if (userCheck.rows.length === 0) {
        res.status(400).json({ message: "User to share with not found" });
        return;
      }

      // Verify the resource exists and belongs to the current user
      let resourceTable: string;
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
        default:
          res.status(400).json({ message: "Invalid resource type" });
          return;
      }

      const resourceCheck = await db.query<{ id: string }>(
        `SELECT id FROM ${resourceTable} WHERE id = $1 AND user_id = $2`,
        [resourceId, req.user.userId]
      );

      if (resourceCheck.rows.length === 0) {
        res.status(404).json({
          message: `${resourceType} not found or you don't have permission to share it`,
        });
        return;
      }

      // Check if already shared with this user
      const existingShare = await db.query<{ id: string }>(
        "SELECT id FROM shares WHERE shared_with_user_id = $1 AND item_type = $2 AND item_id = $3",
        [sharedWithUserId, resourceType, resourceId]
      );

      if (existingShare.rows.length > 0) {
        res.status(400).json({
          message: `${resourceType} is already shared with this user`,
        });
        return;
      }

      // Create the share
      const result = await db.query<ShareRow>(
        `INSERT INTO shares (shared_by_user_id, shared_with_user_id, item_type, item_id, permissions)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          req.user.userId,
          sharedWithUserId,
          resourceType,
          resourceId,
          permission,
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
  [body("permission").isIn(["read", "write"])],
  async (
    req: AuthenticatedRequest<{ id: string }, {}, UpdateShareBody>,
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
      const { permission } = req.body;

      // Check if share exists and belongs to current user
      const shareCheck = await db.query<{ id: string }>(
        "SELECT id FROM shares WHERE id = $1 AND shared_by_user_id = $2",
        [id, req.user.userId]
      );

      if (shareCheck.rows.length === 0) {
        res.status(404).json({
          message: "Share not found or you don't have permission to modify it",
        });
        return;
      }

      // Update the share
      const result = await db.query<ShareRow>(
        "UPDATE shares SET permissions = $1 WHERE id = $2 RETURNING *",
        [permission, id]
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error("Update share error:", error);
      res.status(500).json({ message: "Server error updating share" });
    }
  }
);

// Remove a share
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { id } = req.params;

    // Check if share exists and belongs to current user
    const result = await db.query<{ id: string }>(
      "DELETE FROM shares WHERE id = $1 AND shared_by_user_id = $2 RETURNING id",
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: "Share not found or you don't have permission to remove it",
      });
      return;
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
  async (
    req: AuthenticatedRequest<{}, {}, {}, SharesQueryParams>,
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
      const { resource_type } = req.query;

      let whereClause =
        "WHERE (s.shared_with_user_id = $1 OR s.shared_by_user_id = $1)";
      const params: any[] = [req.user.userId];
      let paramCount = 2;

      if (resource_type) {
        whereClause += ` AND s.item_type = $${paramCount}`;
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
            WHEN s.item_type = 'contact' THEN 
              (SELECT row_to_json(c) FROM (
                SELECT id, first_name, last_name, email, phone, position, status
                FROM contacts WHERE id = s.item_id
              ) c)
            WHEN s.item_type = 'activity' THEN 
              (SELECT row_to_json(a) FROM (
                SELECT id, type, subject, description, due_date, completed as status
                FROM activities WHERE id = s.item_id
              ) a)
            WHEN s.item_type = 'deal' THEN 
              (SELECT row_to_json(d) FROM (
                SELECT id, title, value, currency, probability, stage_id, contact_id, company_id
                FROM deals WHERE id = s.item_id
              ) d)
          END as resource_data
        FROM shares s
        LEFT JOIN users u_shared_by ON s.shared_by_user_id = u_shared_by.id
        LEFT JOIN users u_shared_with ON s.shared_with_user_id = u_shared_with.id
        ${whereClause}
        ORDER BY s.created_at DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(limit, offset);

      const result = await db.query<ShareRow>(query, params);

      // Map data to include computed properties for frontend
      const shares = result.rows.map((share) => ({
        ...share,
        resourceType: share.item_type,
        resourceId: share.item_id,
        createdAt: share.created_at,
        sharedWithFirstName: share.shared_with_first_name,
        sharedWithLastName: share.shared_with_last_name,
        ownerFirstName: share.shared_by_first_name,
        ownerLastName: share.shared_by_last_name,
        isSharedWithMe: share.shared_with_user_id === req.user?.userId,
        resourceTitle: share.resource_data
          ? share.item_type === "contact"
            ? `${share.resource_data.first_name} ${share.resource_data.last_name}`
            : share.item_type === "activity"
            ? share.resource_data.subject || share.resource_data.type
            : share.item_type === "deal"
            ? share.resource_data.title
            : "Unknown"
          : `${share.item_type} #${share.item_id}`,
      }));

      res.json(shares);
    } catch (error) {
      console.error("Get all shares error:", error);
      res.status(500).json({ message: "Server error fetching shares" });
    }
  }
);

// Get users available for sharing (exclude current user)
router.get("/users", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const result = await db.query<UserRow>(
      "SELECT id, first_name, last_name, email FROM users WHERE id != $1 ORDER BY first_name, last_name",
      [req.user.userId]
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

export default router;
