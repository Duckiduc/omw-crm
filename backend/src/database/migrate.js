const db = require('../config/database');

const createTables = async () => {
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

    // Create indexes
    await db.query('CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_deals_user_id ON deals(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_contacts_company_id ON contacts(company_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);');
    await db.query('CREATE INDEX IF NOT EXISTS idx_deals_company_id ON deals(company_id);');

    console.log('✅ Database tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

const seedDefaultData = async (userId) => {
  try {
    // Check if default deal stages exist for this user
    const existingStages = await db.query(
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
        { name: 'Lost', order_index: 6 }
      ];

      for (const stage of defaultStages) {
        await db.query(
          'INSERT INTO deal_stages (name, order_index, user_id) VALUES ($1, $2, $3)',
          [stage.name, stage.order_index, userId]
        );
      }
      console.log('✅ Default deal stages created for user');
    }
  } catch (error) {
    console.error('❌ Error seeding default data:', error);
  }
};

module.exports = {
  createTables,
  seedDefaultData
};