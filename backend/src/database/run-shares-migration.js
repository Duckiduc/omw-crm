require("dotenv").config();
const { createSharesTable } = require("./add-shares-migration");

const runMigration = async () => {
  try {
    await createSharesTable();
    console.log("✅ Shares migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
