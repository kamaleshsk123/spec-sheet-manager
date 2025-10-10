import pool from '../config/database';

const addJsonSchemaToMessageTypes = async () => {
  const client = await pool.connect();
  console.log('Starting add-json-schema-to-message-types migration...');

  try {
    await client.query('BEGIN');

    const columnCheck = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'message_types' AND column_name = 'json_schema';
    `);

    if (columnCheck.rowCount === 0) {
      await client.query(`
        ALTER TABLE message_types
        ADD COLUMN json_schema JSONB;
      `);
      console.log('Added json_schema column to message_types.');
    } else {
      console.log('json_schema column already exists on message_types.');
    }

    await client.query('COMMIT');
    console.log('add-json-schema-to-message-types migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during add-json-schema-to-message-types migration:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  addJsonSchemaToMessageTypes()
    .then(() => {
      console.log('Migration script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default addJsonSchemaToMessageTypes;
