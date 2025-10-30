import express, { Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import db from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { AuthenticatedRequest, Deal } from '../types';

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

interface DealStage {
  id: string;
  name: string;
  order_index: number;
  user_id: string;
  created_at: Date;
}

interface DealRow extends Deal {
  stage_name?: string;
  contact_name?: string;
  company_name?: string;
  is_shared_with_me?: boolean;
  permissions?: string;
}

interface CountRow {
  count: string;
}

interface DealsByStageResponse {
  [stageId: string]: {
    stage: DealStage;
    deals: DealRow[];
  };
}

interface CreateDealBody {
  title: string;
  value?: number;
  currency?: string;
  stageId?: string;
  contactId?: string;
  companyId?: string;
  expectedCloseDate?: string;
  probability?: number;
  notes?: string;
}

interface UpdateDealBody {
  title?: string;
  value?: number;
  currency?: string;
  stageId?: string;
  contactId?: string;
  companyId?: string;
  expectedCloseDate?: string;
  probability?: number;
  notes?: string;
}

interface DealsQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  stageId?: string;
  companyId?: string;
}

interface ValidationRow {
  id: string;
}

interface ExistingDealRow {
  id: string;
  user_id: string;
  permissions?: string;
}

// Get deal stages
router.get('/stages', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const result = await db.query<DealStage>(
      'SELECT * FROM deal_stages WHERE user_id = $1 ORDER BY order_index',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get deal stages error:', error);
    res.status(500).json({ message: 'Server error fetching deal stages' });
  }
});

// Get all deals with pagination and filtering
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('search').optional().trim(),
    query('stageId').optional().isInt(),
    query('companyId').optional().isInt(),
  ],
  async (req: AuthenticatedRequest<{}, {}, {}, DealsQueryParams>, res: Response) => {
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
      const { search, stageId, companyId } = req.query;

      let countQuery = `
        SELECT COUNT(*) 
        FROM deals d 
        LEFT JOIN shares s ON s.item_type = 'deal' AND s.item_id = d.id AND s.shared_with_user_id = $1
        WHERE (d.user_id = $1 OR s.id IS NOT NULL)
      `;
      
      let dataQuery = `
        SELECT d.*, 
          ds.name as stage_name,
          c.first_name || ' ' || c.last_name as contact_name,
          comp.name as company_name,
          CASE WHEN d.user_id = $1 THEN false ELSE true END as is_shared_with_me,
          s.permissions
        FROM deals d 
        LEFT JOIN deal_stages ds ON d.stage_id = ds.id
        LEFT JOIN contacts c ON d.contact_id = c.id
        LEFT JOIN companies comp ON d.company_id = comp.id
        LEFT JOIN shares s ON s.item_type = 'deal' AND s.item_id = d.id AND s.shared_with_user_id = $1
        WHERE (d.user_id = $1 OR s.id IS NOT NULL)
      `;
      
      const params: any[] = [req.user.userId];
      let paramCount = 2;

      // Add filters
      if (search) {
        const searchCondition = ` AND (d.title ILIKE $${paramCount} OR comp.name ILIKE $${paramCount})`;
        countQuery += searchCondition;
        dataQuery += searchCondition;
        params.push(`%${search}%`);
        paramCount++;
      }

      if (stageId) {
        const stageCondition = ` AND d.stage_id = $${paramCount}`;
        countQuery += stageCondition;
        dataQuery += stageCondition;
        params.push(stageId);
        paramCount++;
      }

      if (companyId) {
        const companyCondition = ` AND d.company_id = $${paramCount}`;
        countQuery += companyCondition;
        dataQuery += companyCondition;
        params.push(companyId);
        paramCount++;
      }

      dataQuery += ` ORDER BY d.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;

      const countParams = [...params];
      const dataParams = [...params, limit, offset];

      const [countResult, dataResult] = await Promise.all([
        db.query<CountRow>(countQuery, countParams),
        db.query<DealRow>(dataQuery, dataParams),
      ]);

      const total = parseInt(countResult.rows[0].count, 10);
      const totalPages = Math.ceil(total / limit);

      res.json({
        deals: dataResult.rows,
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
      console.error('Get deals error:', error);
      res.status(500).json({ message: 'Server error fetching deals' });
    }
  }
);

// Get deals by stage (for kanban board)
router.get('/by-stage', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const stagesResult = await db.query<DealStage>(
      'SELECT * FROM deal_stages WHERE user_id = $1 ORDER BY order_index',
      [req.user.userId]
    );

    const dealsByStage: DealsByStageResponse = {};

    for (const stage of stagesResult.rows) {
      const dealsResult = await db.query<DealRow>(
        `SELECT d.*, 
          c.first_name || ' ' || c.last_name as contact_name,
          comp.name as company_name
        FROM deals d 
        LEFT JOIN contacts c ON d.contact_id = c.id
        LEFT JOIN companies comp ON d.company_id = comp.id
        WHERE d.stage_id = $1 AND d.user_id = $2
        ORDER BY d.created_at DESC`,
        [stage.id, req.user.userId]
      );

      dealsByStage[stage.id] = {
        stage: stage,
        deals: dealsResult.rows,
      };
    }

    res.json(dealsByStage);
  } catch (error) {
    console.error('Get deals by stage error:', error);
    res.status(500).json({ message: 'Server error fetching deals by stage' });
  }
});

// Get single deal
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    const result = await db.query<DealRow>(
      `SELECT d.*, 
        ds.name as stage_name,
        c.first_name || ' ' || c.last_name as contact_name,
        comp.name as company_name,
        CASE WHEN d.user_id = $2 THEN false ELSE true END as is_shared_with_me,
        s.permissions
      FROM deals d 
      LEFT JOIN deal_stages ds ON d.stage_id = ds.id
      LEFT JOIN contacts c ON d.contact_id = c.id
      LEFT JOIN companies comp ON d.company_id = comp.id
      LEFT JOIN shares s ON s.item_type = 'deal' AND s.item_id = d.id AND s.shared_with_user_id = $2
      WHERE d.id = $1 AND (d.user_id = $2 OR s.id IS NOT NULL)`,
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'Deal not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get deal error:', error);
    res.status(500).json({ message: 'Server error fetching deal' });
  }
});

// Create deal
router.post(
  '/',
  [
    body('title').trim().notEmpty(),
    body('value').optional().isFloat({ min: 0 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('stageId').optional().isInt(),
    body('contactId').optional().isInt(),
    body('companyId').optional().isInt(),
    body('expectedCloseDate').optional().isISO8601(),
    body('probability').optional().isInt({ min: 0, max: 100 }),
    body('notes').optional().trim(),
  ],
  async (req: AuthenticatedRequest<{}, {}, CreateDealBody>, res: Response) => {
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

      const {
        title,
        value,
        currency,
        stageId,
        contactId,
        companyId,
        expectedCloseDate,
        probability,
        notes,
      } = req.body;

      // Validate foreign keys belong to user
      if (stageId) {
        const stageCheck = await db.query<ValidationRow>(
          'SELECT id FROM deal_stages WHERE id = $1 AND user_id = $2',
          [stageId, req.user.userId]
        );
        if (stageCheck.rows.length === 0) {
          res.status(400).json({ message: 'Invalid stage ID' });
          return;
        }
      }

      if (contactId) {
        const contactCheck = await db.query<ValidationRow>(
          'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
          [contactId, req.user.userId]
        );
        if (contactCheck.rows.length === 0) {
          res.status(400).json({ message: 'Invalid contact ID' });
          return;
        }
      }

      if (companyId) {
        const companyCheck = await db.query<ValidationRow>(
          'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
          [companyId, req.user.userId]
        );
        if (companyCheck.rows.length === 0) {
          res.status(400).json({ message: 'Invalid company ID' });
          return;
        }
      }

      const result = await db.query<Deal>(
        `INSERT INTO deals (
          title, value, currency, stage_id, contact_id, company_id, 
          expected_close_date, probability, notes, user_id
        ) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
        RETURNING *`,
        [
          title,
          value || 0,
          currency || 'USD',
          stageId || null,
          contactId || null,
          companyId || null,
          expectedCloseDate || null,
          probability || 0,
          notes || null,
          req.user.userId,
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Create deal error:', error);
      res.status(500).json({ message: 'Server error creating deal' });
    }
  }
);

// Update deal
router.put(
  '/:id',
  [
    body('title').optional().trim().notEmpty(),
    body('value').optional().isFloat({ min: 0 }),
    body('currency').optional().isLength({ min: 3, max: 3 }),
    body('stageId').optional().isInt(),
    body('contactId').optional().isInt(),
    body('companyId').optional().isInt(),
    body('expectedCloseDate').optional().isISO8601(),
    body('probability').optional().isInt({ min: 0, max: 100 }),
    body('notes').optional().trim(),
  ],
  async (req: AuthenticatedRequest<{ id: string }, {}, UpdateDealBody>, res: Response) => {
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

      // Check if deal exists and user has edit permission
      const existingDeal = await db.query<ExistingDealRow>(
        `SELECT d.id, d.user_id, s.permissions 
         FROM deals d 
         LEFT JOIN shares s ON s.item_type = 'deal' AND s.item_id = d.id AND s.shared_with_user_id = $2
         WHERE d.id = $1 AND (d.user_id = $2 OR s.id IS NOT NULL)`,
        [id, req.user.userId]
      );

      if (existingDeal.rows.length === 0) {
        res.status(404).json({ message: 'Deal not found' });
        return;
      }

      const dealPermissions = existingDeal.rows[0];
      // Check if user is owner or has write permission
      if (
        dealPermissions.user_id !== req.user.userId &&
        dealPermissions.permissions !== 'write'
      ) {
        res.status(403).json({ message: "You don't have permission to edit this deal" });
        return;
      }

      // Validate foreign keys
      if (updates.stageId) {
        const stageCheck = await db.query<ValidationRow>(
          'SELECT id FROM deal_stages WHERE id = $1 AND user_id = $2',
          [updates.stageId, req.user.userId]
        );
        if (stageCheck.rows.length === 0) {
          res.status(400).json({ message: 'Invalid stage ID' });
          return;
        }
      }

      if (updates.contactId) {
        const contactCheck = await db.query<ValidationRow>(
          'SELECT id FROM contacts WHERE id = $1 AND user_id = $2',
          [updates.contactId, req.user.userId]
        );
        if (contactCheck.rows.length === 0) {
          res.status(400).json({ message: 'Invalid contact ID' });
          return;
        }
      }

      if (updates.companyId) {
        const companyCheck = await db.query<ValidationRow>(
          'SELECT id FROM companies WHERE id = $1 AND user_id = $2',
          [updates.companyId, req.user.userId]
        );
        if (companyCheck.rows.length === 0) {
          res.status(400).json({ message: 'Invalid company ID' });
          return;
        }
      }

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      Object.entries(updates).forEach(([key, value]) => {
        const dbField =
          key === 'stageId'
            ? 'stage_id'
            : key === 'contactId'
            ? 'contact_id'
            : key === 'companyId'
            ? 'company_id'
            : key === 'expectedCloseDate'
            ? 'expected_close_date'
            : key;
        fields.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      });

      if (fields.length === 0) {
        res.status(400).json({ message: 'No valid fields to update' });
        return;
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id, req.user.userId);

      const query = `
        UPDATE deals 
        SET ${fields.join(', ')} 
        WHERE id = $${paramCount} AND user_id = $${paramCount + 1} 
        RETURNING *
      `;

      const result = await db.query<Deal>(query, values);
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Update deal error:', error);
      res.status(500).json({ message: 'Server error updating deal' });
    }
  }
);

// Delete deal
router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { id } = req.params;

    // Only allow owner to delete (not shared users)
    const result = await db.query<{ id: string }>(
      'DELETE FROM deals WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: 'Deal not found or you don\'t have permission to delete it',
      });
      return;
    }

    res.json({ message: 'Deal deleted successfully' });
  } catch (error) {
    console.error('Delete deal error:', error);
    res.status(500).json({ message: 'Server error deleting deal' });
  }
});

export default router;