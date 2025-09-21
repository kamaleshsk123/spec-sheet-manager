"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = __importDefault(require("../config/database"));
const createTables = async () => {
    const client = await database_1.default.connect();
    try {
        await client.query('BEGIN');
        // Enable UUID extension
        await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
        // Users table
        await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        // Protobuf specifications table
        await client.query(`
      CREATE TABLE IF NOT EXISTS protobuf_specs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        version VARCHAR(50) DEFAULT '1.0.0',
        description TEXT,
        spec_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        is_published BOOLEAN DEFAULT false,
        tags TEXT[] DEFAULT '{}',
        download_count INTEGER DEFAULT 0
      );
    `);
        // Spec versions table (for version history)
        await client.query(`
      CREATE TABLE IF NOT EXISTS spec_versions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        spec_id UUID REFERENCES protobuf_specs(id) ON DELETE CASCADE,
        version_number VARCHAR(50) NOT NULL,
        spec_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by UUID REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE(spec_id, version_number)
      );
    `);
        // Create indexes for performance
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_created_by ON protobuf_specs(created_by);
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_title_search ON protobuf_specs 
      USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_tags ON protobuf_specs USING GIN (tags);
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_spec_data ON protobuf_specs USING GIN (spec_data);
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_specs_created_at ON protobuf_specs(created_at DESC);
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_spec_versions_spec_id ON spec_versions(spec_id);
    `);
        await client.query('COMMIT');
        console.log('Database tables created successfully!');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating tables:', error);
        throw error;
    }
    finally {
        client.release();
    }
};
// Run migration if called directly
if (require.main === module) {
    createTables()
        .then(() => {
        console.log('Migration completed successfully');
        process.exit(0);
    })
        .catch((error) => {
        console.error('Migration failed:', error);
        process.exit(1);
    });
}
exports.default = createTables;
//# sourceMappingURL=migrate.js.map