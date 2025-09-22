import pool from '../config/database';

const addGithubRepoInfoToSpecs = async () => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Add GitHub repository info columns to protobuf_specs table
    await client.query(`
      ALTER TABLE protobuf_specs
      ADD COLUMN IF NOT EXISTS github_repo_url VARCHAR(255),
      ADD COLUMN IF NOT EXISTS github_repo_name VARCHAR(255);
    `);

    await client.query('COMMIT');
    console.log('Successfully added GitHub repository info to protobuf_specs table!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding GitHub repository info to protobuf_specs table:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if called directly
if (require.main === module) {
  addGithubRepoInfoToSpecs()
    .then(() => {
      console.log('Migration for adding GitHub repo info completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration for adding GitHub repo info failed:', error);
      process.exit(1);
    });
}

export default addGithubRepoInfoToSpecs;
