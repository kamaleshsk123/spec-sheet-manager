"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../../config/database"));
async function up() {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
      ALTER TABLE protobuf_specs
      ADD COLUMN device_name TEXT,
      ADD COLUMN protocols TEXT[],
      ADD COLUMN document_status VARCHAR(50),
      ADD COLUMN for_field TEXT
    `);
        console.log("Columns 'device_name', 'protocols', 'document_status', 'for_field' added to 'protobuf_specs' table.");
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during migration:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
async function down() {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        await client.query(`
      ALTER TABLE protobuf_specs
      DROP COLUMN device_name,
      DROP COLUMN protocols,
      DROP COLUMN document_status,
      DROP COLUMN for_field
    `);
        console.log("Columns 'device_name', 'protocols', 'document_status', 'for_field' removed from 'protobuf_specs' table.");
        await client.query('COMMIT');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during migration rollback:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
const command = process.argv[2];
if (command === 'up') {
    up().catch(err => process.exit(1));
}
else if (command === 'down') {
    down().catch(err => process.exit(1));
}
else {
    console.log('Please specify "up" or "down" as a command-line argument.');
}
//# sourceMappingURL=1_add_spec_details_columns.js.map