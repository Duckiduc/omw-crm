require("dotenv").config();
const { addAdminRole } = require("./add-admin-role-migration");

const runMigration = async () => {
  try {
    await addAdminRole();
    console.log("✅ Admin role migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
