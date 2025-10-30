import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult, query } from 'express-validator';
import db from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/admin';
import { AuthenticatedRequest, User, SystemSetting } from '../types';

const router = express.Router();

// All routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

interface UserRow extends User {
  first_name: string;
  last_name: string;
  created_at: Date;
  updated_at: Date;
}

interface CountRow {
  count: string;
}

interface UserStatsRow {
  total?: string;
  admins?: string;
  regular_users?: string;
  new_this_month?: string;
}

interface AdminQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
}

interface CreateUserBody {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'user' | 'admin';
}

interface UpdateUserBody {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: 'user' | 'admin';
}

interface UpdateSettingBody {
  value: string;
}

// Get all users with pagination and filtering
router.get(
  '/users',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim(),
    query('role').optional().isIn(['user', 'admin']),
  ],
  async (req: AuthenticatedRequest<{}, {}, {}, AdminQueryParams>, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const offset = (page - 1) * limit;
      const { search, role } = req.query;

      let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
      let dataQuery = `
        SELECT id, email, first_name, last_name, role, created_at, updated_at
        FROM users 
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramCount = 1;

      // Add filters
      if (search) {
        const searchCondition = ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
        countQuery += searchCondition;
        dataQuery += searchCondition;
        params.push(`%${search}%`);
        paramCount++;
      }

      if (role) {
        const roleCondition = ` AND role = $${paramCount}`;
        countQuery += roleCondition;
        dataQuery += roleCondition;
        params.push(role);
        paramCount++;
      }

      dataQuery += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

      const countParams = [...params];
      const dataParams = [...params, limit, offset];

      const [countResult, dataResult] = await Promise.all([
        db.query<CountRow>(countQuery, countParams),
        db.query<UserRow>(dataQuery, dataParams),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(total / limit);

      // Map field names to camelCase for frontend consistency
      const users = dataResult.rows.map((user) => ({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      }));

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      });
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Server error fetching users' });
    }
  }
);

// Get single user
router.get('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    const result = await db.query<UserRow>(
      'SELECT id, email, first_name, last_name, role, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const user = result.rows[0];
    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user' });
  }
});

// Create user
router.post(
  '/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().isLength({ min: 1 }),
    body('lastName').trim().isLength({ min: 1 }),
    body('role').optional().isIn(['user', 'admin']),
  ],
  async (req: AuthenticatedRequest<{}, {}, CreateUserBody>, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const { email, password, firstName, lastName, role = 'user' } = req.body;

      // Check if user exists
      const existingUser = await db.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (existingUser.rows.length > 0) {
        res.status(400).json({ message: 'User already exists' });
        return;
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const result = await db.query<UserRow>(
        'INSERT INTO users (email, password, first_name, last_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, first_name, last_name, role, created_at, updated_at',
        [email, hashedPassword, firstName, lastName, role]
      );

      const user = result.rows[0];
      res.status(201).json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Server error creating user' });
    }
  }
);

// Update user
router.put(
  '/users/:id',
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('firstName').optional().trim().isLength({ min: 1 }),
    body('lastName').optional().trim().isLength({ min: 1 }),
    body('role').optional().isIn(['user', 'admin']),
  ],
  async (req: AuthenticatedRequest<{ id: string }, {}, UpdateUserBody>, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const { id } = req.params;
      const updates = req.body;

      // Check if user exists
      const existingUser = await db.query<{ id: string }>(
        'SELECT id FROM users WHERE id = $1',
        [id]
      );

      if (existingUser.rows.length === 0) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      // Prevent admin from demoting themselves
      if (req.user.userId === id && updates.role === 'user') {
        res.status(400).json({
          message: 'Cannot change your own admin role',
        });
        return;
      }

      // Check if email is already taken by another user
      if (updates.email) {
        const emailCheck = await db.query<{ id: string }>(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [updates.email, id]
        );

        if (emailCheck.rows.length > 0) {
          res.status(400).json({ message: 'Email already in use' });
          return;
        }
      }

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (key === 'password') {
          // Hash password if provided
          const saltRounds = 12;
          const hashedPassword = await bcrypt.hash(value as string, saltRounds);
          fields.push(`password = $${paramCount}`);
          values.push(hashedPassword);
        } else {
          const dbField =
            key === 'firstName'
              ? 'first_name'
              : key === 'lastName'
              ? 'last_name'
              : key;
          fields.push(`${dbField} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }

      if (fields.length === 0) {
        res.status(400).json({ message: 'No valid fields to update' });
        return;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);

      const query = `
        UPDATE users 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount} 
        RETURNING id, email, first_name, last_name, role, created_at, updated_at
      `;

      const result = await db.query<UserRow>(query, values);

      const user = result.rows[0];
      res.json({
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Server error updating user' });
    }
  }
);

// Delete user
router.delete('/users/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (req.user.userId === id) {
      res.status(400).json({
        message: 'Cannot delete your own account',
      });
      return;
    }

    const result = await db.query<{ id: string }>(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error deleting user' });
  }
});

// Get system settings
router.get('/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const result = await db.query<SystemSetting>(
      'SELECT setting_key, setting_value, description FROM system_settings ORDER BY setting_key'
    );

    // Convert to object format for easier frontend consumption
    const settings: Record<string, { value: string; description: string }> = {};
    result.rows.forEach((row: any) => {
      settings[row.setting_key] = {
        value: row.setting_value,
        description: row.description || '',
      };
    });

    res.json({ settings });
  } catch (error) {
    console.error('Get system settings error:', error);
    res.status(500).json({ message: 'Server error fetching system settings' });
  }
});

// Update system setting
router.put(
  '/settings/:key',
  [body('value').notEmpty().withMessage('Setting value is required')],
  async (req: AuthenticatedRequest<{ key: string }, {}, UpdateSettingBody>, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      if (!req.user) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const { key } = req.params;
      const { value } = req.body;

      // Validate specific setting types
      if (
        key === 'registration_enabled' &&
        !['true', 'false'].includes(value)
      ) {
        res.status(400).json({
          message: "registration_enabled must be 'true' or 'false'",
        });
        return;
      }

      if (key === 'max_users' && (isNaN(Number(value)) || parseInt(value) < 0)) {
        res.status(400).json({
          message: 'max_users must be a non-negative number',
        });
        return;
      }

      // Update setting
      const result = await db.query<SystemSetting>(
        `UPDATE system_settings 
         SET setting_value = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE setting_key = $2 
         RETURNING setting_key, setting_value, description`,
        [value, key]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ message: 'Setting not found' });
        return;
      }

      const setting = result.rows[0] as any;
      res.json({
        setting_key: setting.setting_key,
        setting_value: setting.setting_value,
        description: setting.description,
      });
    } catch (error) {
      console.error('Update system setting error:', error);
      res.status(500).json({ message: 'Server error updating system setting' });
    }
  }
);

// Get user statistics
router.get('/users/stats/overview', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const stats = await Promise.all([
      db.query<UserStatsRow>('SELECT COUNT(*) as total FROM users'),
      db.query<UserStatsRow>("SELECT COUNT(*) as admins FROM users WHERE role = 'admin'"),
      db.query<UserStatsRow>("SELECT COUNT(*) as regular_users FROM users WHERE role = 'user'"),
      db.query<UserStatsRow>(`
        SELECT COUNT(*) as new_this_month 
        FROM users 
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `),
    ]);

    res.json({
      total: parseInt(stats[0].rows[0].total || '0', 10),
      admins: parseInt(stats[1].rows[0].admins || '0', 10),
      regularUsers: parseInt(stats[2].rows[0].regular_users || '0', 10),
      newThisMonth: parseInt(stats[3].rows[0].new_this_month || '0', 10),
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error fetching user statistics' });
  }
});

export default router;