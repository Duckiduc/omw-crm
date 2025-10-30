import dotenv from "dotenv";
import { addAdminRole } from "./add-admin-role-migration";

dotenv.config();

const runMigration = async (): Promise<void> => {
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
