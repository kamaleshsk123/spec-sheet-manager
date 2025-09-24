"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const addTeamsFeature = async () => {
    const client = await database_1.default.connect();
    console.log('Starting teams feature migration...');
    try {
        await client.query('BEGIN');
        // 1. Create 'teams' table
        console.log('Creating teams table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // 2. Create 'team_members' table
        console.log('Creating team_members table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL DEFAULT 'member', -- e.g., 'owner', 'member'
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (team_id, user_id)
      );
    `);
        // 3. Add 'team_id' to 'protobuf_specs' table
        console.log('Altering protobuf_specs table...');
        // Check if the column already exists
        const columnCheck = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'protobuf_specs' AND column_name = 'team_id';
    `);
        if (columnCheck.rowCount === 0) {
            await client.query(`
        ALTER TABLE protobuf_specs
        ADD COLUMN team_id UUID REFERENCES teams(id) ON DELETE SET NULL;
      `);
            console.log('Added team_id column to protobuf_specs.');
        }
        else {
            console.log('team_id column already exists on protobuf_specs.');
        }
        // 4. Add indexes
        console.log('Creating indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_teams_owner_id ON teams(owner_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_protobuf_specs_team_id ON protobuf_specs(team_id);`);
        await client.query('COMMIT');
        console.log('Teams feature migration completed successfully!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error during teams feature migration:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
// Run migration if called directly
if (require.main === module) {
    addTeamsFeature()
        .then(() => {
        console.log('Migration script finished.');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Migration script failed:', error);
        process.exit(1);
    });
}
exports.default = addTeamsFeature;
//# sourceMappingURL=add-teams-migration.js.map