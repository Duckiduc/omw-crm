const express = require("express");
const { body, validationResult, query, param } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all notes for a specific activity
router.get(
  "/activity/:activityId",
  [param("activityId").isInt({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { activityId } = req.params;

      // Verify activity exists and user has access (owned or shared with edit/view permission)
      const activityCheck = await db.query(
        `SELECT a.id 
         FROM activities a 
         LEFT JOIN shares s ON s.resource_type = 'activity' AND s.resource_id = a.id AND s.shared_with = $2
         WHERE a.id = $1 AND (a.user_id = $2 OR s.id IS NOT NULL)`,
        [activityId, req.user.id]
      );

      if (activityCheck.rows.length === 0) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const result = await db.query(
        `
        SELECT an.*, u.first_name as author_first_name, u.last_name as author_last_name
        FROM activity_notes an
        JOIN users u ON an.user_id = u.id
        WHERE an.activity_id = $1
        ORDER BY an.created_at DESC
      `,
        [activityId]
      );

      const notes = result.rows.map((note) => ({
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
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { activityId, content } = req.body;

      // Verify activity exists and user has access (owned or shared with edit permission)
      const activityCheck = await db.query(
        `SELECT a.id, a.user_id, s.permission
         FROM activities a 
         LEFT JOIN shares s ON s.resource_type = 'activity' AND s.resource_id = a.id AND s.shared_with = $2
         WHERE a.id = $1 AND (a.user_id = $2 OR s.id IS NOT NULL)`,
        [activityId, req.user.id]
      );

      if (activityCheck.rows.length === 0) {
        return res.status(404).json({ message: "Activity not found" });
      }

      const activity = activityCheck.rows[0];
      // Check if user has permission to add notes (must be owner or have edit permission)
      if (activity.user_id !== req.user.id && activity.permission !== "edit") {
        return res.status(403).json({
          message: "You don't have permission to add notes to this activity",
        });
      }

      // Generate a title from the first few words of content
      const title =
        content.split(" ").slice(0, 5).join(" ") +
        (content.split(" ").length > 5 ? "..." : "");

      const result = await db.query(
        `
        INSERT INTO activity_notes (activity_id, content, user_id, title)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
        [activityId, content, req.user.id, title]
      );

      const note = result.rows[0];
      res.status(201).json({
        id: note.id,
        content: note.content,
        activityId: note.activity_id,
        authorName: `${req.user.first_name} ${req.user.last_name}`,
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
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { content } = req.body;

      // Check if note exists and belongs to user
      const existingNote = await db.query(
        "SELECT id FROM activity_notes WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (existingNote.rows.length === 0) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Generate a title from the first few words of content
      const title =
        content.split(" ").slice(0, 5).join(" ") +
        (content.split(" ").length > 5 ? "..." : "");

      const result = await db.query(
        `
        UPDATE activity_notes 
        SET content = $1, title = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3 AND user_id = $4
        RETURNING *
      `,
        [content, title, id, req.user.id]
      );

      const note = result.rows[0];
      res.json({
        id: note.id,
        content: note.content,
        activityId: note.activity_id,
        authorName: `${req.user.first_name} ${req.user.last_name}`,
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
router.delete("/:id", [param("id").isInt({ min: 1 })], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM activity_notes WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Delete activity note error:", error);
    res.status(500).json({ message: "Server error deleting note" });
  }
});

module.exports = router;
