import db from "../config/database";
import bcrypt from "bcryptjs";

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
  orderIndex: number;
  userId: string;
}

export const createTables = async (): Promise<void> => {
  try {
    console.log("🔨 Creating database tables...");

    // Users table
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Contacts table
    await db.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        position VARCHAR(100),
        companyId INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        notes TEXT,
        tags TEXT[], -- Array of tags for flexible categorization
        status VARCHAR(20) DEFAULT 'allGood' CHECK (status IN ('hot', 'warm', 'cold', 'allGood')),
        userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Deal stages lookup
    await db.query(`
      CREATE TABLE IF NOT EXISTS dealStages (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        orderIndex INTEGER NOT NULL,
        userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Deals table
    await db.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        value DECIMAL(12,2) DEFAULT 0,
        currency VARCHAR(3) DEFAULT 'USD',
        stageId INTEGER REFERENCES dealStages(id) ON DELETE SET NULL,
        contactId INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
        companyId INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        expectedCloseDate DATE,
        probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
        notes TEXT,
        userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Activities table
    await db.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL, -- 'call', 'email', 'meeting', 'note', 'task'
        subject VARCHAR(255) NOT NULL,
        description TEXT,
        dueDate TIMESTAMP,
        completed BOOLEAN DEFAULT FALSE,
        contactId INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
        companyId INTEGER REFERENCES companies(id) ON DELETE SET NULL,
        dealId INTEGER REFERENCES deals(id) ON DELETE SET NULL,
        userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Contact notes table for detailed notes management
    await db.query(`
      CREATE TABLE IF NOT EXISTS contactNotes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255), -- Optional title for notes
        content TEXT NOT NULL,
        contactId INTEGER REFERENCES contacts(id) ON DELETE CASCADE,
        userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Activity notes table for detailed notes management
    await db.query(`
      CREATE TABLE IF NOT EXISTS activityNotes (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255), -- Optional title for notes
        content TEXT NOT NULL,
        activityId INTEGER REFERENCES activities(id) ON DELETE CASCADE,
        userId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // System settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS systemSettings (
        id SERIAL PRIMARY KEY,
        settingKey VARCHAR(100) UNIQUE NOT NULL,
        settingValue TEXT NOT NULL,
        description TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Shares table
    await db.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id SERIAL PRIMARY KEY,
        itemType VARCHAR(50) NOT NULL CHECK (itemType IN ('contact', 'organization', 'deal', 'activity')),
        itemId INTEGER NOT NULL,
        sharedByUserId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        sharedWithUserId INTEGER REFERENCES users(id) ON DELETE CASCADE,
        permissions VARCHAR(10) DEFAULT 'read' CHECK (permissions IN ('read', 'write')),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(itemType, itemId, sharedByUserId, sharedWithUserId)
      );
    `);

    // Create indexes
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idxContactsUserId ON contacts(userId);",
      "CREATE INDEX IF NOT EXISTS idxCompaniesUserId ON companies(userId);",
      "CREATE INDEX IF NOT EXISTS idxDealsUserId ON deals(userId);",
      "CREATE INDEX IF NOT EXISTS idxActivitiesUserId ON activities(userId);",
      "CREATE INDEX IF NOT EXISTS idxContactNotesUserId ON contactNotes(userId);",
      "CREATE INDEX IF NOT EXISTS idxContactNotesContactId ON contactNotes(contactId);",
      "CREATE INDEX IF NOT EXISTS idxActivityNotesUserId ON activityNotes(userId);",
      "CREATE INDEX IF NOT EXISTS idxActivityNotesActivityId ON activityNotes(activityId);",
      "CREATE INDEX IF NOT EXISTS idxContactsCompanyId ON contacts(companyId);",
      "CREATE INDEX IF NOT EXISTS idxDealsContactId ON deals(contactId);",
      "CREATE INDEX IF NOT EXISTS idxDealsCompanyId ON deals(companyId);",
      "CREATE INDEX IF NOT EXISTS idxContactsTags ON contacts USING GIN (tags);",
      "CREATE INDEX IF NOT EXISTS idxContactsStatus ON contacts(status);",
      "CREATE INDEX IF NOT EXISTS idxSharesSharedWith ON shares(sharedWithUserId);",
      "CREATE INDEX IF NOT EXISTS idxSharesItem ON shares(itemType, itemId);",
    ];

    for (const indexQuery of indexes) {
      await db.query(indexQuery);
    }

    console.log("✅ Database tables created successfully!");
  } catch (error) {
    console.error("❌ Error creating tables:", error);
    throw error;
  }
};

export const createDefaultAdmin = async (): Promise<AdminUserRow | null> => {
  try {
    // Check if any admin user exists
    const existingAdmin = await db.query<ExistingAdminRow>(
      "SELECT id FROM users WHERE role = $1 LIMIT 1",
      ["admin"]
    );

    if (existingAdmin.rows.length === 0) {
      console.log("🔨 Creating default admin user...");

      // Hash the password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash("password", saltRounds);

      // Create default admin user
      const result = await db.query<AdminUserRow>(
        "INSERT INTO users (email, password, firstName, lastName, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email",
        [
          "admin@omwcrm.local",
          hashedPassword,
          "System",
          "Administrator",
          "admin",
        ]
      );

      const adminUser = result.rows[0];

      // Seed default data for the admin user
      await seedDefaultData(adminUser.id);

      console.log(`✅ Default admin user created: ${adminUser.email}`);
      console.log("📝 Default admin credentials:");
      console.log("   Email: admin@omwcrm.local");
      console.log("   Password: password");
      console.log("   ⚠️  Please change this password after first login!");

      return adminUser;
    } else {
      console.log(
        "ℹ️ Admin user already exists, skipping default admin creation"
      );
      return null;
    }
  } catch (error) {
    console.error("❌ Error creating default admin:", error);
    throw error;
  }
};

export const seedDefaultData = async (userId: string): Promise<void> => {
  try {
    // Check if default deal stages exist for this user
    const existingStages = await db.query<ExistingStagesRow>(
      "SELECT * FROM dealStages WHERE userId = $1",
      [userId]
    );

    if (existingStages.rows.length === 0) {
      const defaultStages = [
        { name: "Lead", orderIndex: 1 },
        { name: "Qualified", orderIndex: 2 },
        { name: "Proposal", orderIndex: 3 },
        { name: "Negotiation", orderIndex: 4 },
        { name: "Won", orderIndex: 5 },
        { name: "Lost", orderIndex: 6 },
      ];

      for (const stage of defaultStages) {
        await db.query(
          "INSERT INTO dealStages (name, orderIndex, userId) VALUES ($1, $2, $3)",
          [stage.name, stage.orderIndex, userId]
        );
      }
      console.log("✅ Default deal stages created for user");
    }

    // Insert default system settings
    const defaultSettings = [
      {
        key: "registrationEnabled",
        value: "true",
        description: "Allow new user registration",
      },
      {
        key: "maxUsers",
        value: "0",
        description: "Maximum number of users (0 = unlimited)",
      },
    ];

    for (const setting of defaultSettings) {
      await db.query(
        `
        INSERT INTO systemSettings (settingKey, settingValue, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (settingKey) DO NOTHING
      `,
        [setting.key, setting.value, setting.description]
      );
    }
  } catch (error) {
    console.error("❌ Error seeding default data:", error);
    throw error;
  }
};
