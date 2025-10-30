import db from "../config/database";

interface ColumnInfo {
  columnName: string;
  is_nullable: string;
  data_type: string;
}

export const fixContactNotesSchema = async (): Promise<void> => {
  try {
    console.log("🔨 Fixing contactNotes table schema...");

    // Check if title column exists and is NOT NULL
    const columnCheck = await db.query<ColumnInfo>(`
      SELECT columnName, is_nullable, data_type
      FROM information_schema.columns 
      WHERE tableName = 'contactNotes' AND columnName = 'title'
    `);

    if (
      columnCheck.rows.length > 0 &&
      columnCheck.rows[0].is_nullable === "NO"
    ) {
      console.log("Making title column nullable...");

      // Make title column nullable
      await db.query(`
        ALTER TABLE contactNotes 
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
    .catch((error: Error) => {
      console.error("Schema fix failed:", error);
      process.exit(1);
    });
}
