const db = require("../config/database");

const createSharesTable = async () => {
  try {
    console.log("🔨 Creating shares table...");

    // Shares table for sharing contacts, activities, and deals
    await db.query(`
      CREATE TABLE IF NOT EXISTS shares (
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

    console.log("✅ Shares table created successfully!");
  } catch (error) {
    console.error("❌ Error creating shares table:", error);
    throw error;
  }
};

module.exports = {
  createSharesTable,
};
