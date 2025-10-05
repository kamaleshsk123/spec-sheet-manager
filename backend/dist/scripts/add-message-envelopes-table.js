"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const addMessageEnvelopesTable = async () => {
    const client = await database_1.default.connect();
    console.log('Starting message_envelopes table migration...');
    try {
        await client.query('BEGIN');
        console.log('Creating message_envelopes table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS message_envelopes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        json_fields JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        await client.query('COMMIT');
        console.log('message_envelopes table migration completed successfully!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during message_envelopes table migration:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
if (require.main === module) {
    addMessageEnvelopesTable()
        .then(() => {
        console.log('Migration script finished.');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
}
exports.default = addMessageEnvelopesTable;
//# sourceMappingURL=add-message-envelopes-table.js.map