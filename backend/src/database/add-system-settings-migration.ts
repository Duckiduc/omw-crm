import db from "../config/database";

export const createSystemSettingsTable = async (): Promise<void> => {
  try {
    console.log("🔨 Creating systemSettings table...");

    // Create systemSettings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS systemSettings (
        id SERIAL PRIMARY KEY,
        settingKey VARCHAR(255) UNIQUE NOT NULL,
        settingValue TEXT NOT NULL,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default settings
    await db.query(`
      INSERT INTO systemSettings (settingKey, settingValue, description) 
      VALUES 
        ('registrationEnabled', 'true', 'Allow new user registration'),
        ('appName', 'OMW CRM', 'Application name'),
        ('maxUsers', '0', 'Maximum number of users (0 = unlimited)')
      ON CONFLICT (settingKey) DO NOTHING;
    `);

    // Create index for faster lookups
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_systemSettings_key ON systemSettings(settingKey);
    `);

    console.log("✅ System settings table created successfully!");
  } catch (error) {
    console.error("❌ Error creating systemSettings table:", error);
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
    .catch((error: Error) => {
      console.error("💥 Migration failed:", error);
      process.exit(1);
    });
}
