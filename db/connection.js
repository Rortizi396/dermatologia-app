const mysql = require('mysql2');
const { Pool } = require('pg');

// Simple DB adapter that exposes .query(sql, params, cb) and .connectWithRetry()
// Supports DB_TYPE = 'mysql' (default) or 'postgres'

// Support standard DATABASE_URL (Render) and fall back to individual vars
const DB_URL = process.env.DATABASE_URL || process.env.DATABASE_URL_STRING || null;
// Determine DB type: explicit DB_TYPE env var wins; otherwise inspect DATABASE_URL
let DB_TYPE = 'mysql';
if (process.env.DB_TYPE) DB_TYPE = process.env.DB_TYPE.toString().toLowerCase();
else if (DB_URL && DB_URL.startsWith('postgres')) DB_TYPE = 'postgres';

// Default values; may be overridden by DATABASE_URL parsing below
let DB_HOST = process.env.DB_HOST || 'localhost';
let DB_PORT = process.env.DB_PORT ? Number(process.env.DB_PORT) : (DB_TYPE === 'postgres' ? 5432 : 3306);
let DB_USER = process.env.DB_USER || (DB_TYPE === 'postgres' ? 'postgres' : 'root');
let DB_PASSWORD = process.env.DB_PASSWORD || '';
let DB_NAME = process.env.DB_NAME || 'dermatologico';
let PG_SSL = false; // when true, pass ssl: { rejectUnauthorized: false } to pg Pool

// If DATABASE_URL is present, parse it and override host/port/user/password/database
if (DB_URL && DB_URL.startsWith('postgres')) {
  try {
    // Use URL parser to be more robust
    const u = new URL(DB_URL);
  // Prefer credentials from DATABASE_URL when available
  if (u.username) DB_USER = decodeURIComponent(u.username);
  if (u.password) DB_PASSWORD = decodeURIComponent(u.password);
    DB_HOST = decodeURIComponent(u.hostname || DB_HOST);
    DB_PORT = u.port ? Number(u.port) : DB_PORT;
    DB_NAME = (u.pathname || '').replace(/^\//, '') || DB_NAME;

    // Check queryparams for sslmode (e.g., ?sslmode=require)
    const sslmode = u.searchParams.get('sslmode') || process.env.PGSSLMODE || null;
    if (sslmode && (sslmode === 'require' || sslmode === 'true' || sslmode === '1')) {
      PG_SSL = true;
    }
  } catch (ex) {
    console.warn('Failed to parse DATABASE_URL, falling back to individual env vars', ex && ex.message ? ex.message : ex);
  }
}

// If the host looks like a managed provider (for example Render's dpg-*.render.com),
// enable SSL by default unless explicitly disabled. Also allow forcing via env var
// FORCE_PG_SSL=true for edge cases.
try {
  const hostLower = (DB_HOST || '').toString().toLowerCase();
  if (!PG_SSL) {
    if (process.env.FORCE_PG_SSL === 'true' || (process.env.PGSSLMODE && (process.env.PGSSLMODE === 'require' || process.env.PGSSLMODE === 'true'))) {
      PG_SSL = true;
    } else if (hostLower.includes('render.com') || hostLower.includes('amazonaws.com') || hostLower.includes('rds.amazonaws.com') || hostLower.includes('db.elephantsql.com')) {
      PG_SSL = true;
    }
  }
} catch (ex) {
  // ignore
}

let nativeConn = null; // mysql connection or pg pool
let adapter = {
  config: { database: DB_NAME },
  dbType: DB_TYPE,
  // query(sql, params, cb) -> supports callback-style used through the codebase
  query: function(sql, params, cb) {
    // Normalize params/callback
    if (typeof params === 'function') { cb = params; params = []; }
    params = params || [];

    if (DB_TYPE === 'postgres') {
      // Convert '?' placeholders to $1, $2, ...
      const converted = convertPlaceholders(sql, params);
      // Use pool.query, return rows to emulate mysql2 result
      const p = nativeConn.query(converted.text, converted.values).then(res => {
        // emulate mysql2: callback receives (err, results)
        const results = res && res.rows ? res.rows : [];
        if (cb) return cb(null, results);
        return results;
      }).catch(err => {
        if (cb) return cb(err);
        throw err;
      });
      return p;
    }

    // MySQL path - use nativeConn which is a Connection or Pool
    try {
      return nativeConn.query(sql, params, function(err, results) {
        if (cb) return cb(err, results);
      });
    } catch (ex) {
      if (cb) return cb(ex);
      throw ex;
    }
  },
  // connectWithRetry tries to create the underlying connection/pool and retry on failure
  connectWithRetry: function(attempt = 0) {
    const maxDelay = 30000;
    const delay = Math.min(maxDelay, 2000 * (attempt + 1));

    if (DB_TYPE === 'postgres') {
      try {
        const poolOptions = {
          host: DB_HOST,
          port: DB_PORT,
          user: DB_USER,
          password: DB_PASSWORD,
          database: DB_NAME,
          max: 10
        };
        if (PG_SSL || process.env.PGSSLMODE === 'require' || process.env.PGSSLMODE === 'true') {
          poolOptions.ssl = { rejectUnauthorized: false };
        }
        nativeConn = new Pool(poolOptions);
        // Log target host/port/db (do not log password)
        console.log(`Postgres: attempting connection to ${DB_HOST}:${DB_PORT} database=${DB_NAME} user=${DB_USER} ssl=${!!poolOptions.ssl}`);
        // Test connection
        return nativeConn.query('SELECT 1').then(() => {
          adapter.config = { database: DB_NAME };
          console.log('✅ Connected to Postgres', DB_HOST, DB_PORT, DB_NAME);
        }).catch(err => {
          console.error('Postgres connection error:', err && err.message ? err.message : err);
          console.log(`Reattempting Postgres connection in ${delay/1000}s...`);
          return new Promise(res => setTimeout(res, delay)).then(() => adapter.connectWithRetry(attempt+1));
        });
      } catch (ex) {
        console.error('Postgres connect exception', ex && ex.message ? ex.message : ex);
        return new Promise(res => setTimeout(res, delay)).then(() => adapter.connectWithRetry(attempt+1));
      }
    }

    // MySQL path
    try {
      nativeConn = mysql.createConnection({
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        connectTimeout: 10000
      });
      nativeConn.connect((err) => {
        if (err) {
          console.error('Error connecting to MySQL:', err);
          console.log(`Retrying MySQL connection in ${delay/1000}s...`);
          setTimeout(() => adapter.connectWithRetry(attempt + 1), delay);
          return;
        }
        adapter.config = nativeConn.config || { database: DB_NAME };
        console.log('✅ Connected to MySQL', DB_HOST, DB_PORT, DB_NAME);
      });
      return Promise.resolve();
    } catch (ex) {
      console.error('MySQL connect exception', ex);
      return new Promise(res => setTimeout(res, delay)).then(() => adapter.connectWithRetry(attempt+1));
    }
  }
};

// Helper: convert '?' placeholders into $n for Postgres
function convertPlaceholders(sql, params) {
  if (!params || params.length === 0) return { text: sql, values: [] };
  let i = 0;
  const text = sql.replace(/\?/g, () => {
    i++;
    return `$${i}`;
  });
  return { text, values: params };
}

module.exports = adapter;
