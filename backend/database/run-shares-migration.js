const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "omw_crm",
  password: process.env.DB_PASSWORD || "password",
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  try {
    console.log("Running shares table migration...");

    const migrationPath = path.join(
      __dirname,
      "../src/database/add-shares-migration.js"
    );
    const migration = require(migrationPath);

    await migration.createSharesTable();

    console.log("✅ Shares table migration completed successfully!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
