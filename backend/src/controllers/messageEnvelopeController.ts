import { Request, Response } from 'express';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';

export class MessageEnvelopeController {
  static async getMessageEnvelopes(req: AuthRequest, res: Response) {
    try {
      const result = await pool.query('SELECT * FROM message_envelopes');
      res.json({ success: true, data: result.rows });
    } catch (error) {
      console.error('Get message envelopes error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async createMessageEnvelope(req: AuthRequest, res: Response) {
    try {
      const { title, description, json_fields } = req.body;

      const result = await pool.query(
        'INSERT INTO message_envelopes (title, description, json_fields) VALUES ($1, $2, $3) RETURNING *',
        [title, description, JSON.stringify(json_fields)]
      );

      res.status(201).json({ success: true, data: result.rows[0], message: 'Message envelope created successfully' });
    } catch (error) {
      console.error('Create message envelope error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async updateMessageEnvelope(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, json_fields } = req.body;

      const result = await pool.query(
        'UPDATE message_envelopes SET title = $1, description = $2, json_fields = $3, updated_at = NOW() WHERE id = $4 RETURNING *',
        [title, description, JSON.stringify(json_fields), id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Message envelope not found' });
      }

      res.json({ success: true, data: result.rows[0], message: 'Message envelope updated successfully' });
    } catch (error) {
      console.error('Update message envelope error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async deleteMessageEnvelope(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const result = await pool.query('DELETE FROM message_envelopes WHERE id = $1 RETURNING id', [id]);

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, error: 'Message envelope not found' });
      }

      res.json({ success: true, message: 'Message envelope deleted successfully' });
    } catch (error) {
      console.error('Delete message envelope error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
