import db from "../config/database";

export const addContactNotesTable = async (): Promise<void> => {
  try {
    console.log("🔨 Adding contactNotes table...");

    // Check if table already exists
    const tableCheck = await db.query<{ tableName: string }>(`
      SELECT tableName 
      FROM information_schema.tables 
      WHERE tableName = 'contactNotes'
    `);

    if (tableCheck.rows.length === 0) {
      // Create contactNotes table
      await db.query(`
        CREATE TABLE contactNotes (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          contactId INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
          userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await db.query(`
        CREATE INDEX idxContactNotesUserId ON contactNotes(userId);
      `);
      await db.query(`
        CREATE INDEX idxContactNotesContactId ON contactNotes(contactId);
      `);

      console.log("✅ Contact notes table created successfully!");
    } else {
      console.log("ℹ️ Contact notes table already exists, skipping migration.");
    }
  } catch (error) {
    console.error("❌ Error adding contact notes table:", error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  addContactNotesTable()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
