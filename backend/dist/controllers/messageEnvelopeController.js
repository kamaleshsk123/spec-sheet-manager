"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageEnvelopeController = void 0;
const database_1 = __importDefault(require("../config/database"));
class MessageEnvelopeController {
    static async getMessageEnvelopes(req, res) {
        try {
            const result = await database_1.default.query('SELECT * FROM message_envelopes');
            res.json({ success: true, data: result.rows });
        }
        catch (error) {
            console.error('Get message envelopes error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    static async createMessageEnvelope(req, res) {
        try {
            const { title, description, json_fields } = req.body;
            const result = await database_1.default.query('INSERT INTO message_envelopes (title, description, json_fields) VALUES ($1, $2, $3) RETURNING *', [title, description, json_fields]);
            res.status(201).json({ success: true, data: result.rows[0], message: 'Message envelope created successfully' });
        }
        catch (error) {
            console.error('Create message envelope error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    static async updateMessageEnvelope(req, res) {
        try {
            const { id } = req.params;
            const { title, description, json_fields } = req.body;
            const result = await database_1.default.query('UPDATE message_envelopes SET title = $1, description = $2, json_fields = $3, updated_at = NOW() WHERE id = $4 RETURNING *', [title, description, json_fields, id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, error: 'Message envelope not found' });
            }
            res.json({ success: true, data: result.rows[0], message: 'Message envelope updated successfully' });
        }
        catch (error) {
            console.error('Update message envelope error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
    static async deleteMessageEnvelope(req, res) {
        try {
            const { id } = req.params;
            const result = await database_1.default.query('DELETE FROM message_envelopes WHERE id = $1 RETURNING id', [id]);
            if (result.rowCount === 0) {
                return res.status(404).json({ success: false, error: 'Message envelope not found' });
            }
            res.json({ success: true, message: 'Message envelope deleted successfully' });
        }
        catch (error) {
            console.error('Delete message envelope error:', error);
            res.status(500).json({ success: false, error: 'Internal server error' });
        }
    }
}
exports.MessageEnvelopeController = MessageEnvelopeController;
//# sourceMappingURL=messageEnvelopeController.js.map