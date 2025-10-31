import db from "../config/database";

export const createSharesTable = async (): Promise<void> => {
  try {
    console.log("🔨 Creating/updating shares table...");

    // Check if shares table exists
    const tableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'shares'
    `);

    if (tableCheck.rows.length === 0) {
      // Create new shares table with updated schema
      await db.query(`
        CREATE TABLE shares (
          id SERIAL PRIMARY KEY,
          sharedBy INTEGER REFERENCES users(id) ON DELETE CASCADE,
          sharedWith INTEGER REFERENCES users(id) ON DELETE CASCADE,
          resourceType VARCHAR(20) NOT NULL CHECK (resourceType IN ('contact', 'activity', 'deal')),
          resourceId INTEGER NOT NULL,
          permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
          message TEXT,
          createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(sharedWith, resourceType, resourceId)
        );
      `);

      // Create indexes for better performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idxSharesSharedWith ON shares(sharedWith);
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idxSharesResource ON shares(resourceType, resourceId);
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idxSharesSharedBy ON shares(sharedBy);
      `);

      console.log("✅ New shares table created successfully!");
    } else {
      console.log(
        "ℹ️ Shares table already exists with existing schema. Skipping recreation."
      );
      console.log(
        "   Note: Existing table uses different column names (itemType, itemId, etc.)"
      );
      console.log(
        "   The application code should be updated to use the existing schema."
      );
    }
  } catch (error) {
    console.error("❌ Error creating shares table:", error);
    throw error;
  }
};
