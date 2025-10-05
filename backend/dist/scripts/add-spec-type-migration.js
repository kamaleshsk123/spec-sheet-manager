"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
async function up() {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        // Add the new column
        await client.query(`
      ALTER TABLE protobuf_specs
      ADD COLUMN spec_type VARCHAR(20) NOT NULL DEFAULT 'protobuf'
    `);
        console.log("Column 'spec_type' added to 'protobuf_specs' table.");
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
        // Remove the column
        await client.query(`
      ALTER TABLE protobuf_specs
      DROP COLUMN spec_type
    `);
        console.log("Column 'spec_type' removed from 'protobuf_specs' table.");
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
// Check command line arguments to decide whether to run up or down
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
//# sourceMappingURL=add-spec-type-migration.js.map