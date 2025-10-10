import pool from '../config/database';

const addJsonFieldsToMessageTypes = async () => {
  const client = await pool.connect();
  console.log('Starting add_json_fields_to_message_types migration...');

  try {
    await client.query('BEGIN');

    console.log('Adding json_fields column to message_types table...');
    await client.query(`
      ALTER TABLE message_types
      ADD COLUMN json_fields JSONB;
    `);

    await client.query('COMMIT');
    console.log('add_json_fields_to_message_types migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during add_json_fields_to_message_types migration:', error);
    throw error;
  } finally {
    client.release();
  }
};

if (require.main === module) {
  addJsonFieldsToMessageTypes()
    .then(() => {
      console.log('Migration script finished.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export default addJsonFieldsToMessageTypes;
