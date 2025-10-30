import db from "../config/database";

export const addContactStatus = async (): Promise<void> => {
  try {
    console.log("🔨 Adding status column to contacts table...");

    // Check if status column already exists
    const columnCheck = await db.query<{ columnName: string }>(`
      SELECT columnName 
      FROM information_schema.columns 
      WHERE tableName = 'contacts' AND columnName = 'status'
    `);

    if (columnCheck.rows.length === 0) {
      // Add status column if it doesn't exist
      await db.query(`
        ALTER TABLE contacts 
        ADD COLUMN status VARCHAR(20) DEFAULT 'allGood' 
        CHECK (status IN ('hot', 'warm', 'cold', 'allGood'));
      `);

      // Create index for better filtering performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idxContactsStatus ON contacts(status);
      `);

      console.log("✅ Status column added successfully!");
    } else {
      console.log("ℹ️ Status column already exists, skipping migration.");
    }
  } catch (error) {
    console.error("❌ Error adding status column:", error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  addContactStatus()
    .then(() => {
      console.log("Status migration completed");
      process.exit(0);
    })
    .catch((error: Error) => {
      console.error("Status migration failed:", error);
      process.exit(1);
    });
}
