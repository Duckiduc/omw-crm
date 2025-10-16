const db = require("../config/database");

const fixContactNotesSchema = async () => {
  try {
    console.log("🔨 Fixing contact_notes table schema...");

    // Check if title column exists and is NOT NULL
    const columnCheck = await db.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'contact_notes' AND column_name = 'title'
    `);

    if (
      columnCheck.rows.length > 0 &&
      columnCheck.rows[0].is_nullable === "NO"
    ) {
      console.log("Making title column nullable...");

      // Make title column nullable
      await db.query(`
        ALTER TABLE contact_notes 
        ALTER COLUMN title DROP NOT NULL;
      `);

      console.log("✅ Contact notes schema fixed successfully!");
    } else if (columnCheck.rows.length === 0) {
      console.log("Title column doesn't exist - schema is correct");
    } else {
      console.log("ℹ️ Title column is already nullable, no changes needed.");
    }
  } catch (error) {
    console.error("❌ Error fixing contact notes schema:", error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  fixContactNotesSchema()
    .then(() => {
      console.log("Schema fix completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Schema fix failed:", error);
      process.exit(1);
    });
}

module.exports = { fixContactNotesSchema };
