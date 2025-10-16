const { createTables } = require("./migrate");

const runMigration = async () => {
  try {
    console.log("🚀 Running OMW CRM Database Migration...");
    console.log(
      "This will create all necessary tables for a fresh installation."
    );
    console.log("");

    await createTables();

    console.log("");
    console.log("✅ Migration completed successfully!");
    console.log("Your database is now ready for OMW CRM.");
    console.log("");
    console.log("Next steps:");
    console.log("1. Start the backend: npm run dev");
    console.log("2. Start the frontend: cd ../frontend && npm run dev");
    console.log("3. Open http://localhost:5174 in your browser");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.log("");
    console.log("Please check:");
    console.log("1. PostgreSQL is running");
    console.log("2. Database exists");
    console.log("3. .env file has correct database credentials");

    process.exit(1);
  }
};

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
