const db = require("../config/database");

const addActivityNotesTable = async () => {
  try {
    console.log("🔨 Adding activity_notes table...");

    // Check if table already exists
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'activity_notes'
    `);

    if (tableCheck.rows.length === 0) {
      // Create activity_notes table
      await db.query(`
        CREATE TABLE activity_notes (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // Create indexes
      await db.query(`
        CREATE INDEX idx_activity_notes_user_id ON activity_notes(user_id);
      `);
      await db.query(`
        CREATE INDEX idx_activity_notes_activity_id ON activity_notes(activity_id);
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
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { addActivityNotesTable };
