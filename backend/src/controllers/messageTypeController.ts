import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Helper to check if a user has access to a spec (is owner or team member)
async function checkSpecAccess(specId: string, userId: string): Promise<boolean> {
  const specResult = await pool.query('SELECT created_by, team_id FROM protobuf_specs WHERE id = $1', [specId]);
  if (specResult.rowCount === 0) {
    return false; // Spec not found
  }
  const spec = specResult.rows[0];

  // It's a personal spec, check ownership
  if (spec.team_id === null) {
    return spec.created_by === userId;
  }

  // It's a team spec, check membership
  const memberResult = await pool.query('SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2', [spec.team_id, userId]);
  return !!memberResult?.rowCount;
}


export class MessageTypeController {
  static async getMessageTypes(req: Request, res: Response) {
    try {
      const { specId } = req.params;
      const result = await pool.query('SELECT * FROM message_types WHERE spec_id = $1 ORDER BY created_at ASC', [specId]);
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get message types error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async createMessageType(req: AuthRequest, res: Response) {
    try {
      const { specId } = req.params;
      const { name, payload_definition, json_schema } = req.body;
      const userId = req.user!.id;

      const hasAccess = await checkSpecAccess(specId, userId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const result = await pool.query(
        'INSERT INTO message_types (spec_id, name, payload_definition, json_schema) VALUES ($1, $2, $3, $4) RETURNING *',
        [specId, name, payload_definition, json_schema]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Message type created successfully' });
    } catch (error) {
      console.error('Create message type error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async updateMessageType(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { name, payload_definition, json_schema } = req.body;
      const userId = req.user!.id;

      const messageTypeResult = await pool.query('SELECT spec_id FROM message_types WHERE id = $1', [id]);
      if (messageTypeResult.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Message type not found' });
      }
      const { spec_id } = messageTypeResult.rows[0];

      const hasAccess = await checkSpecAccess(spec_id, userId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const result = await pool.query(
        'UPDATE message_types SET name = $1, payload_definition = $2, json_schema = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [name, payload_definition, json_schema, id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Message type not found' });
      }

      res.json({ success: true, data: result.rows[0], message: 'Message type updated successfully' });
    } catch (error) {
      console.error('Update message type error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async deleteMessageType(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const messageTypeResult = await pool.query('SELECT spec_id FROM message_types WHERE id = $1', [id]);
      if (messageTypeResult.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Message type not found' });
      }
      const { spec_id } = messageTypeResult.rows[0];

      const hasAccess = await checkSpecAccess(spec_id, userId);
      if (!hasAccess) {
        return res.status(403).json({ success: false, error: 'Access denied' });
      }

      const result = await pool.query('DELETE FROM message_types WHERE id = $1 RETURNING id', [id]);

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Message type not found' });
      }

      res.json({ success: true, message: 'Message type deleted successfully' });
    } catch (error) {
      console.error('Delete message type error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}