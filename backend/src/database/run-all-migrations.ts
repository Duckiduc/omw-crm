import dotenv from "dotenv";
import { createTables, seedDefaultData, createDefaultAdmin } from "./migrate";
import { addAdminRole } from "./add-admin-role-migration";
import { createSharesTable } from "./add-shares-migration";
import { addContactNotesTable } from "./add-contact-notes-migration";
import { addActivityNotesTable } from "./add-activity-notes-migration";
import { addContactStatus } from "./add-contact-status-migration";
import { addTagsToContacts } from "./add-tags-migration";
import { fixContactNotesSchema } from "./fix-contact-notes-schema";
import { createSystemSettingsTable } from "./add-system-settings-migration";

dotenv.config();

const runAllMigrations = async (): Promise<void> => {
  try {
    console.log("🚀 Running ALL OMW CRM Database Migrations...");
    console.log("This will create/update all necessary tables and columns.");
    console.log("");

    // Step 1: Create base tables
    console.log("Step 1: Creating base tables...");
    await createTables();

    // Step 2: Add admin role column
    console.log("Step 2: Adding admin role column...");
    await addAdminRole();

    // Step 3: Add contact status column
    console.log("Step 3: Adding contact status column...");
    await addContactStatus();

    // Step 4: Add tags column to contacts
    console.log("Step 4: Adding tags column to contacts...");
    await addTagsToContacts();

    // Step 5: Add contact notes table
    console.log("Step 5: Adding contact notes table...");
    await addContactNotesTable();

    // Step 6: Add activity notes table
    console.log("Step 6: Adding activity notes table...");
    await addActivityNotesTable();

    // Step 7: Fix contact notes schema
    console.log("Step 7: Fixing contact notes schema...");
    await fixContactNotesSchema();

    // Step 8: Create shares table
    console.log("Step 8: Creating shares table...");
    await createSharesTable();

    // Step 9: Create system settings table
    console.log("Step 9: Creating system settings table...");
    await createSystemSettingsTable();

    // Step 10: Create default admin user
    console.log("Step 10: Creating default admin user...");
    await createDefaultAdmin();

    console.log("");
    console.log("✅ ALL migrations completed successfully!");
    console.log("Your database is now fully up to date with OMW CRM.");
    console.log("");
    console.log("Migration summary:");
    console.log("- ✅ Base tables created");
    console.log("- ✅ Admin role system added");
    console.log("- ✅ Contact status tracking added");
    console.log("- ✅ Contact tags system added");
    console.log("- ✅ Contact notes system added");
    console.log("- ✅ Activity notes system added");
    console.log("- ✅ Contact notes schema fixed");
    console.log("- ✅ Sharing system added");
    console.log("- ✅ System settings table added");
    console.log("- ✅ Default admin user created");
    console.log("");
    console.log("Next steps:");
    console.log("1. Start the backend: npm run dev");
    console.log("2. Start the frontend: cd ../frontend && npm run dev");
    console.log("3. Open http://localhost:5174 in your browser");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", (error as Error).message);
    console.log("");
    console.log("Please check:");
    console.log("1. PostgreSQL is running");
    console.log("2. Database exists");
    console.log("3. .env file has correct database credentials");

    process.exit(1);
  }
};

if (require.main === module) {
  runAllMigrations();
}

export default runAllMigrations;
