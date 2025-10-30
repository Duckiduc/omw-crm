#!/usr/bin/env node

import { createTables, createDefaultAdmin } from './migrate';

async function setupDatabase(): Promise<void> {
  try {
    console.log('🚀 Setting up database...');
    
    // Create all tables
    await createTables();
    
    // Create default admin user
    await createDefaultAdmin();
    
    console.log('✅ Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };