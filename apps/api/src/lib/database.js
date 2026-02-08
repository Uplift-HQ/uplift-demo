// ============================================================
// DATABASE HELPER
// PostgreSQL connection pool with transaction support
// ============================================================

import pg from 'pg';
const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/uplift',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log connection events
pool.on('connect', () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('Database connection established');
  }
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
});

/**
 * Database helper object
 */
export const db = {
  /**
   * Execute a query
   */
  async query(text, params) {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log('Slow query:', { text: text.slice(0, 100), duration: `${duration}ms` });
      }
      
      return result;
    } catch (error) {
      console.error('Query error:', { text: text.slice(0, 100), error: error.message });
      throw error;
    }
  },

  /**
   * Get a client from the pool (for transactions)
   */
  async getClient() {
    return pool.connect();
  },

  /**
   * Execute a transaction
   * @param {Function} callback - Receives client, must return result
   */
  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const result = await pool.query('SELECT NOW() as now');
      return { healthy: true, timestamp: result.rows[0].now };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  },

  /**
   * Get pool stats
   */
  getPoolStats() {
    return {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    };
  },

  /**
   * Close pool (for graceful shutdown)
   */
  async close() {
    await pool.end();
    console.log('Database pool closed');
  },

  /**
   * Helper: Build INSERT query
   */
  buildInsert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    return {
      text: `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`,
      values,
    };
  },

  /**
   * Helper: Build UPDATE query
   */
  buildUpdate(table, data, where) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`);
    
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClauses = whereKeys.map((key, i) => `${key} = $${keys.length + i + 1}`);

    return {
      text: `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *`,
      values: [...values, ...whereValues],
    };
  },

  /**
   * Helper: Paginate query results
   */
  paginate(baseQuery, { page = 1, perPage = 20 } = {}) {
    const offset = (page - 1) * perPage;
    return `${baseQuery} LIMIT ${perPage} OFFSET ${offset}`;
  },

  /**
   * Helper: Get count for pagination
   */
  async getCount(table, where = {}) {
    let query = `SELECT COUNT(*) FROM ${table}`;
    const values = [];

    if (Object.keys(where).length > 0) {
      const whereClauses = Object.keys(where).map((key, i) => {
        values.push(where[key]);
        return `${key} = $${i + 1}`;
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await pool.query(query, values);
    return parseInt(result.rows[0].count);
  },

  /**
   * Helper: Find one record
   */
  async findOne(table, where) {
    const keys = Object.keys(where);
    const values = Object.values(where);
    const whereClauses = keys.map((key, i) => `${key} = $${i + 1}`);

    const result = await pool.query(
      `SELECT * FROM ${table} WHERE ${whereClauses.join(' AND ')} LIMIT 1`,
      values
    );

    return result.rows[0] || null;
  },

  /**
   * Helper: Find many records
   */
  async findMany(table, where = {}, options = {}) {
    let query = `SELECT * FROM ${table}`;
    const values = [];

    if (Object.keys(where).length > 0) {
      const whereClauses = Object.keys(where).map((key, i) => {
        values.push(where[key]);
        return `${key} = $${i + 1}`;
      });
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    const result = await pool.query(query, values);
    return result.rows;
  },

  /**
   * Helper: Upsert (insert or update)
   */
  async upsert(table, data, conflictColumns, updateColumns) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    const updates = updateColumns.map(col => `${col} = EXCLUDED.${col}`);

    const query = `
      INSERT INTO ${table} (${keys.join(', ')}) 
      VALUES (${placeholders.join(', ')})
      ON CONFLICT (${conflictColumns.join(', ')}) 
      DO UPDATE SET ${updates.join(', ')}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  },

  /**
   * Helper: Soft delete
   */
  async softDelete(table, id, statusColumn = 'status', deletedStatus = 'deleted') {
    const result = await pool.query(
      `UPDATE ${table} SET ${statusColumn} = $2 WHERE id = $1 RETURNING *`,
      [id, deletedStatus]
    );
    return result.rows[0];
  },
};

export default db;
