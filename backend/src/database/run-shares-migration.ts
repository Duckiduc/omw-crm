import dotenv from "dotenv";
import { createSharesTable } from "./add-shares-migration";

dotenv.config();

const runMigration = async (): Promise<void> => {
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
