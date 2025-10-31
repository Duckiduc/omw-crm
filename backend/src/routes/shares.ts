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
  sharedByUserId: string;
  sharedWithUserId: string;
  itemType: "contact" | "activity" | "deal";
  itemId: string;
  permissions: string;
  message?: string;
  createdAt: Date;
  updatedAt?: Date;
  sharedByFirstName?: string;
  sharedByLastName?: string;
  sharedByEmail?: string;
  sharedWithFirstName?: string;
  sharedWithLastName?: string;
  sharedWithEmail?: string;
  resourceData?: any;
}

interface CountRow {
  count: string;
}

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SharesQueryParams {
  type?: "contact" | "activity" | "deal";
  resourceType?: "contact" | "activity" | "deal";
  page?: number;
  limit?: number;
}

interface CreateShareBody {
  resourceType: "contact" | "activity" | "deal";
  resourceId: number;
  sharedWithUserId: number;
  permission?: "view" | "edit";
  message?: string;
}

interface UpdateShareBody {
  permission: "view" | "edit";
  message?: string;
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

      let whereClause = "WHERE s.sharedWithUserId = $1";
      const params: any[] = [req.user.userId];
      let paramCount = 2;

      if (type) {
        whereClause += ` AND s.itemType = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      const query = `
        SELECT 
          s.*,
          u.firstName as sharedByFirstName,
          u.lastName as sharedByLastName,
          u.email as sharedByEmail,
          CASE 
            WHEN s.itemType = 'contact' THEN 
              (SELECT json_build_object(
                'id', id, 'firstName', firstName, 'lastName', lastName, 
                'email', email, 'phone', phone, 'companyName', (SELECT name FROM companies WHERE id = contacts.companyId)
              ) FROM contacts WHERE id = s.itemId)
            WHEN s.itemType = 'activity' THEN 
              (SELECT json_build_object(
                'id', id, 'subject', subject, 'description', description, 'dueDate', dueDate
              ) FROM activities WHERE id = s.itemId)
            WHEN s.itemType = 'deal' THEN 
              (SELECT json_build_object(
                'id', id, 'title', title, 'value', value, 'currency', currency, 'probability', probability, 'notes', notes
              ) FROM deals WHERE id = s.itemId)
          END as resourceData
        FROM shares s
        JOIN users u ON s.sharedByUserId = u.id
        ${whereClause}
        ORDER BY s.createdAt DESC
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

      let whereClause = "WHERE s.sharedByUserId = $1";
      const params: any[] = [req.user.userId];
      let paramCount = 2;

      if (type) {
        whereClause += ` AND s.itemType = $${paramCount}`;
        params.push(type);
        paramCount++;
      }

      const query = `
        SELECT 
          s.*,
          u.firstName as sharedWithFirstName,
          u.lastName as sharedWithLastName,
          u.email as sharedWithEmail
        FROM shares s
        JOIN users u ON s.sharedWithUserId = u.id
        ${whereClause}
        ORDER BY s.createdAt DESC
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
    body("permission").optional().isIn(["view", "edit"]),
    body("message").optional().trim(),
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
        permission = "view",
        message,
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
        `SELECT id FROM ${resourceTable} WHERE id = $1 AND userId = $2`,
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
        "SELECT id FROM shares WHERE sharedWithUserId = $1 AND itemType = $2 AND itemId = $3",
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
        `INSERT INTO shares (sharedByUserId, sharedWithUserId, itemType, itemId, permissions, message)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          req.user.userId,
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
      const { permission, message } = req.body;

      // Check if share exists and belongs to current user
      const shareCheck = await db.query<{ id: string }>(
        "SELECT id FROM shares WHERE id = $1 AND sharedByUserId = $2",
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
        "UPDATE shares SET permission = $1, message = $2, updatedAt = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
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
router.delete("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "User not authenticated" });
      return;
    }

    const { id } = req.params;

    // Check if share exists and belongs to current user
    const result = await db.query<{ id: string }>(
      "DELETE FROM shares WHERE id = $1 AND sharedByUserId = $2 RETURNING id",
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
    query("resourceType").optional().isIn(["contact", "activity", "deal"]),
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
      const { resourceType } = req.query;

      let whereClause =
        "WHERE (s.sharedWithUserId = $1 OR s.sharedByUserId = $1)";
      const params: any[] = [req.user.userId];
      let paramCount = 2;

      if (resourceType) {
        whereClause += ` AND s.itemType = $${paramCount}`;
        params.push(resourceType);
        paramCount++;
      }

      const query = `
        SELECT 
          s.*,
          uSharedBy.firstName as sharedByFirstName,
          uSharedBy.lastName as sharedByLastName,
          uSharedBy.email as sharedByEmail,
          uSharedWith.firstName as sharedWithFirstName,
          uSharedWith.lastName as sharedWithLastName,
          uSharedWith.email as sharedWithEmail,
          CASE 
            WHEN s.itemType = 'contact' THEN 
              (SELECT row_to_json(c) FROM (
                SELECT id, firstName, lastName, email, phone, position, status
                FROM contacts WHERE id = s.itemId
              ) c)
            WHEN s.itemType = 'activity' THEN 
              (SELECT row_to_json(a) FROM (
                SELECT id, type, subject, description, dueDate, completed as status
                FROM activities WHERE id = s.itemId
              ) a)
            WHEN s.itemType = 'deal' THEN 
              (SELECT row_to_json(d) FROM (
                SELECT id, title, value, currency, probability, stageId, contactId, companyId
                FROM deals WHERE id = s.itemId
              ) d)
          END as resourceData
        FROM shares s
        LEFT JOIN users uSharedBy ON s.sharedByUserId = uSharedBy.id
        LEFT JOIN users uSharedWith ON s.sharedWithUserId = uSharedWith.id
        ${whereClause}
        ORDER BY s.createdAt DESC
        LIMIT $${paramCount} OFFSET $${paramCount + 1}
      `;

      params.push(limit, offset);

      const result = await db.query<ShareRow>(query, params);

      // Add computed properties for frontend
      const shares = result.rows.map((share) => ({
        ...share,
        resourceType: share.itemType,
        resourceId: share.itemId,
        ownerFirstName: share.sharedByFirstName,
        ownerLastName: share.sharedByLastName,
        isSharedWithMe: share.sharedWithUserId === req.user?.userId,
        resourceTitle: share.resourceData
          ? share.itemType === "contact"
            ? `${share.resourceData.firstName} ${share.resourceData.lastName}`
            : share.itemType === "activity"
            ? share.resourceData.subject || share.resourceData.type
            : share.itemType === "deal"
            ? share.resourceData.title
            : "Unknown"
          : `${share.itemType} #${share.itemId}`,
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
      "SELECT id, firstname, lastname, email FROM users WHERE id != $1 ORDER BY firstname, lastname",
      [req.user.userId]
    );

    // Map to camelCase for frontend consistency
    const users = result.rows.map((user: any) => ({
      id: user.id,
      firstName: user.firstname,
      lastName: user.lastname,
      email: user.email,
    }));

    res.json(users);
  } catch (error) {
    console.error("Get users for sharing error:", error);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

export default router;
