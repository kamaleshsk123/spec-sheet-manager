import pool from '../config/database';

const addPayloadDefinitionToMessageTypes = async () => {
  const client = await pool.connect();
  console.log('Starting add-payload-definition-to-message-types migration...');

  try {
    await client.query('BEGIN');

    const columnCheck = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'message_types' AND column_name = 'payload_definition';
    `);

    if (columnCheck.rowCount === 0) {
      await client.query(`
        ALTER TABLE message_types
        ADD COLUMN payload_definition TEXT;
      `);
      console.log('Added payload_definition column to message_types.');
    } else {
      console.log('payload_definition column already exists on message_types.');
    }

    await client.query('COMMIT');
    console.log('add-payload-definition-to-message-types migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during add-payload-definition-to-message-types migration:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  addPayloadDefinitionToMessageTypes()
    .then(() => {
      console.log('Migration script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default addPayloadDefinitionToMessageTypes;
