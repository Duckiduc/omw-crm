const db = require("../config/database");

const addContactStatus = async () => {
  try {
    console.log("🔨 Adding status column to contacts table...");

    // Check if status column already exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contacts' AND column_name = 'status'
    `);

    if (columnCheck.rows.length === 0) {
      // Add status column if it doesn't exist
      await db.query(`
        ALTER TABLE contacts 
        ADD COLUMN status VARCHAR(20) DEFAULT 'all_good' 
        CHECK (status IN ('hot', 'warm', 'cold', 'all_good'));
      `);

      // Create index for better filtering performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
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
    .catch((error) => {
      console.error("Status migration failed:", error);
      process.exit(1);
    });
}

module.exports = { addContactStatus };
