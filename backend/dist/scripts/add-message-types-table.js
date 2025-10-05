"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const addMessageTypesTable = async () => {
    const client = await database_1.default.connect();
    console.log('Starting message_types table migration...');
    try {
        await client.query('BEGIN');
        console.log('Creating message_types table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS message_types (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        spec_id UUID NOT NULL REFERENCES protobuf_specs(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        payload_definition TEXT,
        json_schema JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('Creating indexes on message_types table...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_message_types_spec_id ON message_types(spec_id);`);
        await client.query('COMMIT');
        console.log('message_types table migration completed successfully!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during message_types table migration:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
if (require.main === module) {
    addMessageTypesTable()
        .then(() => {
        console.log('Migration script finished.');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
}
exports.default = addMessageTypesTable;
//# sourceMappingURL=add-message-types-table.js.map