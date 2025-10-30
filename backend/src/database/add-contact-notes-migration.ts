import db from "../config/database";

export const addContactNotesTable = async (): Promise<void> => {
  try {
    console.log("🔨 Adding contact_notes table...");

    // Check if table already exists
    const tableCheck = await db.query<{ table_name: string }>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'contact_notes'
    `);

    if (tableCheck.rows.length === 0) {
      // Create contact_notes table
      await db.query(`
        CREATE TABLE contact_notes (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await db.query(`
        CREATE INDEX idx_contact_notes_user_id ON contact_notes(user_id);
      `);
      await db.query(`
        CREATE INDEX idx_contact_notes_contact_id ON contact_notes(contact_id);
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
