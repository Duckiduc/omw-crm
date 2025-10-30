import db from '../config/database';
import bcrypt from 'bcryptjs';

interface AdminUserRow {
  id: string;
  email: string;
}

interface ExistingAdminRow {
  id: string;
}

interface ExistingStagesRow {
  id: string;
  name: string;
  order_index: number;
  user_id: string;
}

export const createTables = async (): Promise<void> => {
  try {
    console.log('🔨 Creating database tables...');

    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Companies table
    await db.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        industry VARCHAR(100),
        website VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        notes TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Contacts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        position VARCHAR(100),
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        notes TEXT,
        tags TEXT[], -- Array of tags for flexible categorization
        status VARCHAR(20) DEFAULT 'all_good' CHECK (status IN ('hot', 'warm', 'cold', 'all_good')),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Deal stages lookup
    await db.query(`
      CREATE TABLE IF NOT EXISTS deal_stages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        order_index INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Deals table
    await db.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        value DECIMAL(12,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        stage_id INTEGER REFERENCES deal_stages(id) ON DELETE SET NULL,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        expected_close_date DATE,
        probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
        notes TEXT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Activities table
    await db.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note', 'task'
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        due_date TIMESTAMP,
        completed BOOLEAN DEFAULT FALSE,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
        company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Contact notes table for detailed notes management
    await db.query(`
      CREATE TABLE IF NOT EXISTS contact_notes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255), -- Optional title for notes
        content TEXT NOT NULL,
        contact_id INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Activity notes table for detailed notes management
    await db.query(`
      CREATE TABLE IF NOT EXISTS activity_notes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255), -- Optional title for notes
        content TEXT NOT NULL,
        activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // System settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Shares table
    await db.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id SERIAL PRIMARY KEY,
        item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('contact', 'organization', 'deal', 'activity')),
        item_id INTEGER NOT NULL,
        shared_by_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        shared_with_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        permissions VARCHAR(10) DEFAULT 'read' CHECK (permissions IN ('read', 'write')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(item_type, item_id, shared_by_user_id, shared_with_user_id)
      );
    `);

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_contact_notes_user_id ON contact_notes(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_contact_notes_contact_id ON contact_notes(contact_id);',
      'CREATE INDEX IF NOT EXISTS idx_activity_notes_user_id ON activity_notes(user_id);',
      'CREATE INDEX IF NOT EXISTS idx_activity_notes_activity_id ON activity_notes(activity_id);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);',
      'CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN (tags);',
      'CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);',
      'CREATE INDEX IF NOT EXISTS idx_shares_shared_with ON shares(shared_with_user_id);',
      'CREATE INDEX IF NOT EXISTS idx_shares_item ON shares(item_type, item_id);',
    ];

    for (const indexQuery of indexes) {
      await db.query(indexQuery);
    }

    console.log('✅ Database tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

export const createDefaultAdmin = async (): Promise<AdminUserRow | null> => {
  try {
    // Check if any admin user exists
    const existingAdmin = await db.query<ExistingAdminRow>(
      'SELECT id FROM users WHERE role = $1 LIMIT 1',
      ['admin']
    );

    if (existingAdmin.rows.length === 0) {
      console.log('🔨 Creating default admin user...');

      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash('password', saltRounds);

      // Create default admin user
      const result = await db.query<AdminUserRow>(
        'INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email',
        [
          'admin@omwcrm.local',
          hashedPassword,
          'System',
          'Administrator',
          'admin',
        ]
      );

      const adminUser = result.rows[0];

      // Seed default data for the admin user
      await seedDefaultData(adminUser.id);

      console.log(`✅ Default admin user created: ${adminUser.email}`);
      console.log('📝 Default admin credentials:');
      console.log('   Email: admin@omwcrm.local');
      console.log('   Password: password');
      console.log('   ⚠️  Please change this password after first login!');

      return adminUser;
    } else {
      console.log(
        'ℹ️ Admin user already exists, skipping default admin creation'
      );
      return null;
    }
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    throw error;
  }
};

export const seedDefaultData = async (userId: string): Promise<void> => {
  try {
    // Check if default deal stages exist for this user
    const existingStages = await db.query<ExistingStagesRow>(
      'SELECT * FROM deal_stages WHERE user_id = $1',
      [userId]
    );

    if (existingStages.rows.length === 0) {
      const defaultStages = [
        { name: 'Lead', order_index: 1 },
        { name: 'Qualified', order_index: 2 },
        { name: 'Proposal', order_index: 3 },
        { name: 'Negotiation', order_index: 4 },
        { name: 'Won', order_index: 5 },
        { name: 'Lost', order_index: 6 },
      ];

      for (const stage of defaultStages) {
        await db.query(
          'INSERT INTO deal_stages (name, order_index, user_id) VALUES ($1, $2, $3)',
          [stage.name, stage.order_index, userId]
        );
      }
      console.log('✅ Default deal stages created for user');
    }

    // Insert default system settings
    const defaultSettings = [
      {
        key: 'registration_enabled',
        value: 'true',
        description: 'Allow new user registration'
      },
      {
        key: 'max_users',
        value: '0',
        description: 'Maximum number of users (0 = unlimited)'
      }
    ];

    for (const setting of defaultSettings) {
      await db.query(`
        INSERT INTO system_settings (setting_key, setting_value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (setting_key) DO NOTHING
      `, [setting.key, setting.value, setting.description]);
    }
  } catch (error) {
    console.error('❌ Error seeding default data:', error);
    throw error;
  }
};