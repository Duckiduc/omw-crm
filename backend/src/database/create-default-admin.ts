#!/usr/bin/env node

import { createDefaultAdmin } from "./migrate";

async function createAdmin(): Promise<void> {
  try {
    console.log("🚀 Creating default admin...");
    await createDefaultAdmin();
    console.log("🎉 Default admin creation completed!");
    process.exit(0);
  } catch (error) {
    console.error("💥 Default admin creation failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  createAdmin();
}

export { createDefaultAdmin };
