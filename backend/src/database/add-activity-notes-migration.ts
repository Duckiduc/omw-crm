import db from "../config/database";

export const addActivityNotesTable = async (): Promise<void> => {
  try {
    console.log("🔨 Adding activityNotes table...");

    // Check if table already exists
    const tableCheck = await db.query<{ tableName: string }>(`
      SELECT tableName 
      FROM information_schema.tables 
      WHERE tableName = 'activityNotes'
    `);

    if (tableCheck.rows.length === 0) {
      // Create activityNotes table
      await db.query(`
        CREATE TABLE activityNotes (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          activityId INTEGER REFERENCES activities(id) ON DELETE CASCADE,
          userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await db.query(`
        CREATE INDEX idxActivityNotesUserId ON activityNotes(userId);
      `);
      await db.query(`
        CREATE INDEX idxActivityNotesActivityId ON activityNotes(activityId);
      `);

      console.log("✅ Activity notes table created successfully!");
    } else {
      console.log(
        "ℹ️ Activity notes table already exists, skipping migration."
      );
    }
  } catch (error) {
    console.error("❌ Error adding activity notes table:", error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  addActivityNotesTable()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
