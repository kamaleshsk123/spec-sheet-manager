"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const addGithubToUsers = async () => {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        // Add GitHub columns to users table
        await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS github_id VARCHAR(255) UNIQUE,
      ADD COLUMN IF NOT EXISTS github_username VARCHAR(255),
      ADD COLUMN IF NOT EXISTS github_access_token VARCHAR(255);
    `);
        await client.query('COMMIT');
        console.log('Successfully added GitHub columns to users table!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding GitHub columns to users table:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
// Run migration if called directly
if (require.main === module) {
    addGithubToUsers()
        .then(() => {
        console.log('Migration for adding GitHub fields completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Migration for adding GitHub fields failed:', error);
        process.exit(1);
    });
}
exports.default = addGithubToUsers;
//# sourceMappingURL=add-github-to-users.js.map