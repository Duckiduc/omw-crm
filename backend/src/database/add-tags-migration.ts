import db from "../config/database";

export const addTagsToContacts = async (): Promise<void> => {
  try {
    console.log("🔨 Adding tags column to contacts table...");

    // Check if tags column already exists
    const columnCheck = await db.query<{ columnName: string }>(`
      SELECT columnName 
      FROM information_schema.columns 
      WHERE tableName = 'contacts' AND columnName = 'tags'
    `);

    if (columnCheck.rows.length === 0) {
      // Add tags column if it doesn't exist
      await db.query(`
        ALTER TABLE contacts 
        ADD COLUMN tags TEXT[] DEFAULT '{}';
      `);

      // Create index for better search performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idxContactsTags ON contacts USING GIN (tags);
      `);

      console.log("✅ Tags column added successfully!");
    } else {
      console.log("ℹ️ Tags column already exists, skipping migration.");
    }
  } catch (error) {
    console.error("❌ Error adding tags column:", error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  addTagsToContacts()
    .then(() => {
      console.log("Migration completed");
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
