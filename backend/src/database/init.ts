#!/usr/bin/env node

import { createTables } from "./migrate";

async function initializeDatabase(): Promise<void> {
  try {
    console.log("🚀 Initializing database...");
    await createTables();
    console.log("✅ Database initialization completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database initialization failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };
