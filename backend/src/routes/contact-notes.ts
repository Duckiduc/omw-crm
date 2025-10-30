import express, { Response } from "express";
import { body, validationResult, param } from "express-validator";
import db from "../config/database";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest } from "../types";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

interface ContactNote {
  id: string;
  contactId: string;
  content: string;
  title?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ContactNoteRow extends ContactNote {
  authorFirstName?: string;
  authorLastName?: string;
}

interface CreateContactNoteBody {
  contactId: number;
  content: string;
}

interface UpdateContactNoteBody {
  content: string;
}

interface ContactNoteResponse {
  id: string;
  content: string;
  contactId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

// Get all notes for a specific contact
router.get(
  "/contact/:contactId",
  [param("contactId").isInt({ min: 1 })],
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

      const { contactId } = req.params;

      // Verify contact belongs to user
      const contactCheck = await db.query<{ id: string }>(
        "SELECT id FROM contacts WHERE id = $1 AND userId = $2",
        [contactId, req.user.userId]
      );

      if (contactCheck.rows.length === 0) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }

      const result = await db.query<ContactNoteRow>(
        `SELECT cn.*, u.firstName as authorFirstName, u.lastName as authorLastName
        FROM contactNotes cn
        JOIN users u ON cn.userId = u.id
        WHERE cn.contactId = $1 AND cn.userId = $2
        ORDER BY cn.createdAt DESC`,
        [contactId, req.user.userId]
      );

      const notes: ContactNoteResponse[] = result.rows.map((note) => ({
        id: note.id,
        content: note.content,
        contactId: note.contactId,
        authorName: `${note.authorFirstName} ${note.authorLastName}`,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
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
  async (
    req: AuthenticatedRequest<{}, {}, CreateContactNoteBody>,
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

      const { contactId, content } = req.body;

      // Verify contact belongs to user
      const contactCheck = await db.query<{ id: string }>(
        "SELECT id FROM contacts WHERE id = $1 AND userId = $2",
        [contactId, req.user.userId]
      );

      if (contactCheck.rows.length === 0) {
        res.status(404).json({ message: "Contact not found" });
        return;
      }

      const result = await db.query<ContactNote>(
        `INSERT INTO contactNotes (contactId, content, userId, title)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [contactId, content, req.user.userId, null]
      );

      const note = result.rows[0];

      // Get user name for response
      const userResult = await db.query<{
        firstName: string;
        lastName: string;
      }>("SELECT firstName, lastName FROM users WHERE id = $1", [
        req.user.userId,
      ]);
      const user = userResult.rows[0];

      res.status(201).json({
        id: note.id,
        content: note.content,
        contactId: note.contactId,
        authorName: `${user.firstName} ${user.lastName}`,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
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
  async (
    req: AuthenticatedRequest<{ id: string }, {}, UpdateContactNoteBody>,
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
        "SELECT id FROM contactNotes WHERE id = $1 AND userId = $2",
        [id, req.user.userId]
      );

      if (existingNote.rows.length === 0) {
        res.status(404).json({ message: "Note not found" });
        return;
      }

      const result = await db.query<ContactNote>(
        `UPDATE contactNotes 
        SET content = $1, updatedAt = CURRENT_TIMESTAMP
        WHERE id = $2 AND userId = $3
        RETURNING *`,
        [content, id, req.user.userId]
      );

      const note = result.rows[0];

      // Get user name for response
      const userResult = await db.query<{
        firstName: string;
        lastName: string;
      }>("SELECT firstName, lastName FROM users WHERE id = $1", [
        req.user.userId,
      ]);
      const user = userResult.rows[0];

      res.json({
        id: note.id,
        content: note.content,
        contactId: note.contactId,
        authorName: `${user.firstName} ${user.lastName}`,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });
    } catch (error) {
      console.error("Update note error:", error);
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
        "DELETE FROM contactNotes WHERE id = $1 AND userId = $2 RETURNING id",
        [id, req.user.userId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: "Note not found" });
        return;
      }

      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      console.error("Delete note error:", error);
      res.status(500).json({ message: "Server error deleting note" });
    }
  }
);

export default router;
