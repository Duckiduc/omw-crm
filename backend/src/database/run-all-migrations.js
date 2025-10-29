require("dotenv").config();
const {
  createTables,
  seedDefaultData,
  createDefaultAdmin,
} = require("./migrate");
const { addAdminRole } = require("./add-admin-role-migration");
const { createSharesTable } = require("./add-shares-migration");
const { addContactNotesTable } = require("./add-contact-notes-migration");
const { addActivityNotesTable } = require("./add-activity-notes-migration");
const { addContactStatus } = require("./add-contact-status-migration");
const { addTagsToContacts } = require("./add-tags-migration");
const { fixContactNotesSchema } = require("./fix-contact-notes-schema");
const {
  createSystemSettingsTable,
} = require("./add-system-settings-migration");

const runAllMigrations = async () => {
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
  runAllMigrations();
}

module.exports = runAllMigrations;
