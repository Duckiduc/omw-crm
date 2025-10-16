const express = require("express");
const { body, validationResult, query, param } = require("express-validator");
const db = require("../config/database");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all notes for a specific contact
router.get(
  "/contact/:contactId",
  [param("contactId").isInt({ min: 1 })],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { contactId } = req.params;

      // Verify contact belongs to user
      const contactCheck = await db.query(
        "SELECT id FROM contacts WHERE id = $1 AND user_id = $2",
        [contactId, req.user.id]
      );

      if (contactCheck.rows.length === 0) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const result = await db.query(
        `
        SELECT cn.*, u.first_name as author_first_name, u.last_name as author_last_name
        FROM contact_notes cn
        JOIN users u ON cn.user_id = u.id
        WHERE cn.contact_id = $1 AND cn.user_id = $2
        ORDER BY cn.created_at DESC
      `,
        [contactId, req.user.id]
      );

      const notes = result.rows.map((note) => ({
        id: note.id,
        content: note.content,
        contactId: note.contact_id,
        authorName: `${note.author_first_name} ${note.author_last_name}`,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      }));

      res.json({ notes });
    } catch (error) {
      console.error("Get contact notes error:", error);
      res.status(500).json({ message: "Server error fetching notes" });
    }
  }
);

// Create a new note for a contact
router.post(
  "/",
  [
    body("contactId").isInt({ min: 1 }),
    body("content").trim().notEmpty().withMessage("Note content is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { contactId, content } = req.body;

      // Verify contact belongs to user
      const contactCheck = await db.query(
        "SELECT id FROM contacts WHERE id = $1 AND user_id = $2",
        [contactId, req.user.id]
      );

      if (contactCheck.rows.length === 0) {
        return res.status(404).json({ message: "Contact not found" });
      }

      const result = await db.query(
        `
        INSERT INTO contact_notes (contact_id, content, user_id, title)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `,
        [contactId, content, req.user.id, null]
      );

      const note = result.rows[0];
      res.status(201).json({
        id: note.id,
        content: note.content,
        contactId: note.contact_id,
        authorName: `${req.user.firstName} ${req.user.lastName}`,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      });
    } catch (error) {
      console.error("Create note error:", error);
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
        "SELECT id FROM contact_notes WHERE id = $1 AND user_id = $2",
        [id, req.user.id]
      );

      if (existingNote.rows.length === 0) {
        return res.status(404).json({ message: "Note not found" });
      }

      const result = await db.query(
        `
        UPDATE contact_notes 
        SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND user_id = $3
        RETURNING *
      `,
        [content, id, req.user.id]
      );

      const note = result.rows[0];
      res.json({
        id: note.id,
        content: note.content,
        contactId: note.contact_id,
        authorName: `${req.user.firstName} ${req.user.lastName}`,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
      });
    } catch (error) {
      console.error("Update note error:", error);
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
      "DELETE FROM contact_notes WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Delete note error:", error);
    res.status(500).json({ message: "Server error deleting note" });
  }
});

module.exports = router;
