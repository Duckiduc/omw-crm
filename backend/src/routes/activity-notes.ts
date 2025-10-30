import express, { Response } from "express";
import { body, validationResult, query, param } from "express-validator";
import db from "../config/database";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

interface ActivityNote {
  id: string;
  activity_id: string;
  content: string;
  title: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

interface ActivityNoteRow extends ActivityNote {
  author_first_name?: string;
  author_last_name?: string;
}

interface ActivityCheckRow {
  id: string;
  user_id?: string;
  permission?: string;
}

interface CreateActivityNoteBody {
  activityId: number;
  content: string;
}

interface UpdateActivityNoteBody {
  content: string;
}

interface ActivityNoteResponse {
  id: string;
  content: string;
  activityId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Get all notes for a specific activity
router.get(
  "/activity/:activityId",
  [param("activityId").isInt({ min: 1 })],
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

      const { activityId } = req.params;

      // Verify activity exists and user has access (owned or shared with edit/view permission)
      const activityCheck = await db.query<ActivityCheckRow>(
        `SELECT a.id 
         FROM activities a 
         LEFT JOIN shares s ON s.item_type = 'activity' AND s.item_id = a.id AND s.shared_with_user_id = $2
         WHERE a.id = $1 AND (a.user_id = $2 OR s.id IS NOT NULL)`,
        [activityId, req.user.userId]
      );

      if (activityCheck.rows.length === 0) {
        res.status(404).json({ message: "Activity not found" });
        return;
      }

      const result = await db.query<ActivityNoteRow>(
        `SELECT an.*, u.first_name as author_first_name, u.last_name as author_last_name
        FROM activity_notes an
        JOIN users u ON an.user_id = u.id
        WHERE an.activity_id = $1
        ORDER BY an.created_at DESC`,
        [activityId]
      );

      const notes: ActivityNoteResponse[] = result.rows.map((note) => ({
        id: note.id,
        content: note.content,
        activityId: note.activity_id,
        authorName: `${note.author_first_name} ${note.author_last_name}`,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }));

      res.json({ notes });
    } catch (error) {
      console.error("Get activity notes error:", error);
      res.status(500).json({ message: "Server error fetching notes" });
    }
  }
);

// Create a new note for an activity
router.post(
  "/",
  [
    body("activityId").isInt({ min: 1 }),
    body("content").trim().notEmpty().withMessage("Note content is required"),
  ],
  async (
    req: AuthenticatedRequest<{}, {}, CreateActivityNoteBody>,
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

      const { activityId, content } = req.body;

      // Verify activity exists and user has access (owned or shared with edit permission)
      const activityCheck = await db.query<ActivityCheckRow>(
        `SELECT a.id, a.user_id, s.permissions as permission
         FROM activities a 
         LEFT JOIN shares s ON s.item_type = 'activity' AND s.item_id = a.id AND s.shared_with_user_id = $2
         WHERE a.id = $1 AND (a.user_id = $2 OR s.id IS NOT NULL)`,
        [activityId, req.user.userId]
      );

      if (activityCheck.rows.length === 0) {
        res.status(404).json({ message: "Activity not found" });
        return;
      }

      const activity = activityCheck.rows[0];
      // Check if user has permission to add notes (must be owner or have edit permission)
      if (
        activity.user_id !== req.user.userId &&
        activity.permission !== "edit"
      ) {
        res.status(403).json({
          message: "You don't have permission to add notes to this activity",
        });
        return;
      }

      // Generate a title from the first few words of content
      const title =
        content.split(" ").slice(0, 5).join(" ") +
        (content.split(" ").length > 5 ? "..." : "");

      const result = await db.query<ActivityNote>(
        `INSERT INTO activity_notes (activity_id, content, user_id, title)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [activityId, content, req.user.userId, title]
      );

      const note = result.rows[0];

      // Get user name for response
      const userResult = await db.query<{
        first_name: string;
        last_name: string;
      }>("SELECT first_name, last_name FROM users WHERE id = $1", [
        req.user.userId,
      ]);
      const user = userResult.rows[0];

      res.status(201).json({
        id: note.id,
        content: note.content,
        activityId: note.activity_id,
        authorName: `${user.first_name} ${user.last_name}`,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      });
    } catch (error) {
      console.error("Create activity note error:", error);
      res.status(500).json({ message: "Server error creating note" });
    }
  }
);

// Update a note
router.put(
  "/:id",
  [
    param("id").isInt({ min: 1 }),
    body("content").trim().notEmpty().withMessage("Note content is required"),
  ],
  async (
    req: AuthenticatedRequest<{ id: string }, {}, UpdateActivityNoteBody>,
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
      const { content } = req.body;

      // Check if note exists and belongs to user
      const existingNote = await db.query<{ id: string }>(
        "SELECT id FROM activity_notes WHERE id = $1 AND user_id = $2",
        [id, req.user.userId]
      );

      if (existingNote.rows.length === 0) {
        res.status(404).json({ message: "Note not found" });
        return;
      }

      // Generate a title from the first few words of content
      const title =
        content.split(" ").slice(0, 5).join(" ") +
        (content.split(" ").length > 5 ? "..." : "");

      const result = await db.query<ActivityNote>(
        `UPDATE activity_notes 
        SET content = $1, title = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *`,
        [content, title, id, req.user.userId]
      );

      const note = result.rows[0];

      // Get user name for response
      const userResult = await db.query<{
        first_name: string;
        last_name: string;
      }>("SELECT first_name, last_name FROM users WHERE id = $1", [
        req.user.userId,
      ]);
      const user = userResult.rows[0];

      res.json({
        id: note.id,
        content: note.content,
        activityId: note.activity_id,
        authorName: `${user.first_name} ${user.last_name}`,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      });
    } catch (error) {
      console.error("Update activity note error:", error);
      res.status(500).json({ message: "Server error updating note" });
    }
  }
);

// Delete a note
router.delete(
  "/:id",
  [param("id").isInt({ min: 1 })],
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

      const result = await db.query<{ id: string }>(
        "DELETE FROM activity_notes WHERE id = $1 AND user_id = $2 RETURNING id",
        [id, req.user.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Note not found" });
        return;
      }

      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Delete activity note error:", error);
      res.status(500).json({ message: "Server error deleting note" });
    }
  }
);

export default router;
