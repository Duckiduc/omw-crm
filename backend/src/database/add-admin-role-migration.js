const db = require("../config/database");

const addAdminRole = async () => {
  try {
    console.log("🔨 Adding admin role to users table...");

    // Add role column to users table
    await db.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user' 
      CHECK (role IN ('user', 'admin'))
    `);

    // Create an admin user if none exists
    const adminCheck = await db.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (adminCheck.rows.length === 0) {
      console.log(
        "No admin user found. Please create one manually or through registration."
      );
    }

    console.log("✅ Admin role migration completed successfully!");
  } catch (error) {
    console.error("❌ Error adding admin role:", error);
    throw error;
  }
};

module.exports = {
  addAdminRole,
};
