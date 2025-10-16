const db = require("../config/database");

const addTagsToContacts = async () => {
  try {
    console.log("🔨 Adding tags column to contacts table...");

    // Check if tags column already exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contacts' AND column_name = 'tags'
    `);

    if (columnCheck.rows.length === 0) {
      // Add tags column if it doesn't exist
      await db.query(`
        ALTER TABLE contacts 
        ADD COLUMN tags TEXT[] DEFAULT '{}';
      `);

      // Create index for better search performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN (tags);
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
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { addTagsToContacts };
