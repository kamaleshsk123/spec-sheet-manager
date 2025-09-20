import { Request, Response } from 'express';
import pool from '../config/database';
import { 
  CreateSpecRequest, 
  UpdateSpecRequest, 
  ProtobufSpec, 
  ApiResponse, 
  PaginatedResponse,
  SpecQueryParams,
  SpecVersion
} from '../models/types';
import { AuthRequest } from '../middleware/auth';

export class SpecController {
  static async createSpec(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;
      const { title, version = '1.0.0', description, spec_data, tags = [] }: CreateSpecRequest = req.body;

      const result = await pool.query(
        `INSERT INTO protobuf_specs (title, version, description, spec_data, created_by, tags) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         RETURNING *`,
        [title, version, description, JSON.stringify(spec_data), userId, tags]
      );

      const spec = result.rows[0];

      // Create initial version
      await pool.query(
        `INSERT INTO spec_versions (spec_id, version_number, spec_data, created_by)
         VALUES ($1, $2, $3, $4)`,
        [spec.id, version, JSON.stringify(spec_data), userId]
      );

      res.status(201).json({
        success: true,
        data: spec,
        message: 'Specification created successfully'
      } as ApiResponse<ProtobufSpec>);

    } catch (error) {
      console.error('Create spec error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async getSpecs(req: AuthRequest, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        tags,
        created_by,
        is_published,
        sort_by = 'created_at',
        sort_order = 'desc'
      }: SpecQueryParams = req.query as any;

      const offset = (page - 1) * limit;
      let whereConditions: string[] = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(`to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $${paramIndex})`);
        queryParams.push(search);
        paramIndex++;
      }

      if (tags && tags.length > 0) {
        whereConditions.push(`tags && $${paramIndex}`);
        queryParams.push(Array.isArray(tags) ? tags : [tags]);
        paramIndex++;
      }

      if (created_by) {
        whereConditions.push(`created_by = $${paramIndex}`);
        queryParams.push(created_by);
        paramIndex++;
      }

      if (is_published !== undefined) {
        whereConditions.push(`is_published = $${paramIndex}`);
        queryParams.push(is_published);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      const orderClause = `ORDER BY ${sort_by} ${sort_order.toUpperCase()}`;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM protobuf_specs ps
        LEFT JOIN users u ON ps.created_by = u.id
        ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get specs with pagination
      const specsQuery = `
        SELECT 
          ps.*,
          u.name as created_by_name,
          u.email as created_by_email
        FROM protobuf_specs ps
        LEFT JOIN users u ON ps.created_by = u.id
        ${whereClause}
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const specsResult = await pool.query(specsQuery, queryParams);

      const response: PaginatedResponse<ProtobufSpec> = {
        data: specsResult.rows,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      };

      res.json({
        success: true,
        data: response
      } as ApiResponse<PaginatedResponse<ProtobufSpec>>);

    } catch (error) {
      console.error('Get specs error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async getSpec(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          ps.*,
          u.name as created_by_name,
          u.email as created_by_email
         FROM protobuf_specs ps
         LEFT JOIN users u ON ps.created_by = u.id
         WHERE ps.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specification not found'
        } as ApiResponse);
      }

      res.json({
        success: true,
        data: result.rows[0]
      } as ApiResponse<ProtobufSpec>);

    } catch (error) {
      console.error('Get spec error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async updateSpec(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const updateData: UpdateSpecRequest = req.body;

      // Check if spec exists and user owns it
      const existingSpec = await pool.query(
        'SELECT * FROM protobuf_specs WHERE id = $1 AND created_by = $2',
        [id, userId]
      );

      if (existingSpec.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specification not found or access denied'
        } as ApiResponse);
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      Object.entries(updateData).forEach(([key, value]) => {
        if (value !== undefined) {
          if (key === 'spec_data') {
            updateFields.push(`${key} = $${paramIndex}`);
            queryParams.push(JSON.stringify(value));
          } else {
            updateFields.push(`${key} = $${paramIndex}`);
            queryParams.push(value);
          }
          paramIndex++;
        }
      });

      updateFields.push(`updated_at = NOW()`);
      queryParams.push(id);

      const updateQuery = `
        UPDATE protobuf_specs 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, queryParams);

      // If version or spec_data changed, create new version
      if (updateData.version || updateData.spec_data) {
        const spec = result.rows[0];
        await pool.query(
          `INSERT INTO spec_versions (spec_id, version_number, spec_data, created_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (spec_id, version_number) DO NOTHING`,
          [spec.id, spec.version, JSON.stringify(spec.spec_data), userId]
        );
      }

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Specification updated successfully'
      } as ApiResponse<ProtobufSpec>);

    } catch (error) {
      console.error('Update spec error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async deleteSpec(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const result = await pool.query(
        'DELETE FROM protobuf_specs WHERE id = $1 AND created_by = $2 RETURNING id',
        [id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Specification not found or access denied'
        } as ApiResponse);
      }

      res.json({
        success: true,
        message: 'Specification deleted successfully'
      } as ApiResponse);

    } catch (error) {
      console.error('Delete spec error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async getSpecVersions(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `SELECT 
          sv.*,
          u.name as created_by_name
         FROM spec_versions sv
         LEFT JOIN users u ON sv.created_by = u.id
         WHERE sv.spec_id = $1
         ORDER BY sv.created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        data: result.rows
      } as ApiResponse<SpecVersion[]>);

    } catch (error) {
      console.error('Get spec versions error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async incrementDownloadCount(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await pool.query(
        'UPDATE protobuf_specs SET download_count = download_count + 1 WHERE id = $1',
        [id]
      );

      res.json({
        success: true,
        message: 'Download count updated'
      } as ApiResponse);

    } catch (error) {
      console.error('Increment download count error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }

  static async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const userId = req.user!.id;

      // Get user's specs count
      const specsCount = await pool.query(
        'SELECT COUNT(*) as total FROM protobuf_specs WHERE created_by = $1',
        [userId]
      );

      // Get published specs count
      const publishedCount = await pool.query(
        'SELECT COUNT(*) as total FROM protobuf_specs WHERE created_by = $1 AND is_published = true',
        [userId]
      );

      // Get total downloads
      const totalDownloads = await pool.query(
        'SELECT SUM(download_count) as total FROM protobuf_specs WHERE created_by = $1',
        [userId]
      );

      // Get recent specs
      const recentSpecs = await pool.query(
        `SELECT id, title, version, created_at, download_count, is_published
         FROM protobuf_specs 
         WHERE created_by = $1 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [userId]
      );

      res.json({
        success: true,
        data: {
          totalSpecs: parseInt(specsCount.rows[0].total),
          publishedSpecs: parseInt(publishedCount.rows[0].total),
          totalDownloads: parseInt(totalDownloads.rows[0].total || '0'),
          recentSpecs: recentSpecs.rows
        }
      } as ApiResponse);

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      } as ApiResponse);
    }
  }
}