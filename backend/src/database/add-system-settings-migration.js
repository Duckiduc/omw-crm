const db = require("../config/database");

const createSystemSettingsTable = async () => {
  try {
    console.log("🔨 Creating system_settings table...");

    // Create system_settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default settings
    await db.query(`
      INSERT INTO system_settings (setting_key, setting_value, description) 
      VALUES 
        ('registration_enabled', 'true', 'Allow new user registration'),
        ('app_name', 'OMW CRM', 'Application name'),
        ('max_users', '0', 'Maximum number of users (0 = unlimited)')
      ON CONFLICT (setting_key) DO NOTHING;
    `);

    // Create index for faster lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(setting_key);
    `);

    console.log("✅ System settings table created successfully!");
  } catch (error) {
    console.error("❌ Error creating system_settings table:", error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  createSystemSettingsTable()
    .then(() => {
      console.log("🎉 System settings migration completed!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}

module.exports = { createSystemSettingsTable };
