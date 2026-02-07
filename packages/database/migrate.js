// ============================================================
// DATABASE MIGRATION RUNNER
// Runs all SQL migration files in order
// Usage: node migrate.js
// ============================================================

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uplift'
});

async function migrate() {
  const client = await pool.connect();

  try {
    console.log('🚀 Starting database migrations...\n');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Get list of executed migrations
    const executed = await client.query('SELECT filename FROM _migrations');
    const executedFiles = new Set(executed.rows.map(r => r.filename));

    // Get all migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort alphabetically (migration files should be named with timestamps)

    let migratedCount = 0;

    for (const file of files) {
      if (executedFiles.has(file)) {
        console.log(`⏭️  Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`📄 Running ${file}...`);

      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`   ✅ ${file} completed`);
        migratedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`   ❌ ${file} failed:`, error.message);
        throw error;
      }
    }

    console.log(`\n✅ Migrations complete! (${migratedCount} new, ${files.length - migratedCount} skipped)\n`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
