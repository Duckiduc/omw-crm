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
          shared_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
          shared_with INTEGER REFERENCES users(id) ON DELETE CASCADE,
          resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('contact', 'activity', 'deal')),
          resource_id INTEGER NOT NULL,
          permission VARCHAR(20) DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
          message TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(shared_with, resource_type, resource_id)
        );
      `);

      // Create indexes for better performance
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with);
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_shares_resource ON shares(resource_type, resource_id);
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_shares_shared_by ON shares(shared_by);
      `);

      console.log("✅ New shares table created successfully!");
    } else {
      console.log(
        "ℹ️ Shares table already exists with existing schema. Skipping recreation."
      );
      console.log(
        "   Note: Existing table uses different column names (item_type, item_id, etc.)"
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
