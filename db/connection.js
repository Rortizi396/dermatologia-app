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
let DB_PASSWORD = process.env.DB_PASSWORD || 'root';
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

// Safety: allow an explicit local-DB override for short-lived internal testing.
// To enable, set DB_USE_LOCAL=true AND ALLOW_LOCAL_DB=true and provide LOCAL_DB_* env vars.
// This prevents accidentally connecting a deployed service to an arbitrary host.
try {
  const useLocal = (process.env.DB_USE_LOCAL || '').toString().toLowerCase() === 'true';
  const allowLocal = (process.env.ALLOW_LOCAL_DB || '').toString().toLowerCase() === 'true';
  if (useLocal) {
    if (!allowLocal) {
      console.warn('[DB ADAPTER] DB_USE_LOCAL=true detected but ALLOW_LOCAL_DB is not true — ignoring local DB override for safety.');
    } else {
      console.warn('[DB ADAPTER] DB_USE_LOCAL=true and ALLOW_LOCAL_DB=true -> overriding DB host/creds from LOCAL_DB_* env vars (for internal testing only).');
      DB_HOST = process.env.LOCAL_DB_HOST || DB_HOST;
      DB_PORT = process.env.LOCAL_DB_PORT ? Number(process.env.LOCAL_DB_PORT) : DB_PORT;
      DB_USER = process.env.LOCAL_DB_USER || DB_USER;
      DB_PASSWORD = process.env.LOCAL_DB_PASSWORD || DB_PASSWORD;
      DB_NAME = process.env.LOCAL_DB_NAME || DB_NAME;
      if (process.env.LOCAL_DB_TYPE) DB_TYPE = process.env.LOCAL_DB_TYPE.toString().toLowerCase();
      // When explicitly using a local DB for quick tests, do not force PG SSL.
      if (DB_TYPE === 'postgres') PG_SSL = false;
    }
  }
} catch (ex) {
  console.warn('[DB ADAPTER] error while processing local DB override env vars', ex && ex.message ? ex.message : ex);
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
  // attempt: number of attempts already made (0-based)
  connectWithRetry: function(attempt = 0) {
    const maxDelay = 30000;
    const delay = Math.min(maxDelay, 2000 * (attempt + 1));
    const MAX_RETRIES = process.env.MAX_DB_RETRIES ? Number(process.env.MAX_DB_RETRIES) : 5;

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
          const msg = err && err.message ? err.message : err;
          console.error('Postgres connection error:', msg);
          // Detect common auth failure and provide actionable guidance
          if (err && (err.code === '28P01' || msg.toString().toLowerCase().includes('password authentication failed') || msg.toString().toLowerCase().includes('authentication failed'))) {
            console.error('[DB ADAPTER] Postgres authentication failed. A few ways to fix this:');
            console.error('  - Verify your DATABASE_URL or DB_USER/DB_PASSWORD in your .env or environment variables.');
            console.error('  - If you are running Postgres locally, create a user and database and set DB_USE_LOCAL=true & ALLOW_LOCAL_DB=true with LOCAL_DB_* vars.');
            console.error('  - Example `.env` entries: DB_TYPE=postgres, DB_HOST=localhost, DB_PORT=5432, DB_USER=youruser, DB_PASSWORD=yourpass, DB_NAME=dermatologico');
            console.error('  - SQL to create a user: see scripts/setup_local_db.sql');
            // Don't spam retries on credential errors — let the operator fix credentials first.
            return Promise.resolve();
          }
          if (attempt >= MAX_RETRIES) {
            console.error(`[DB ADAPTER] Reached max retries (${MAX_RETRIES}) for Postgres. Giving up until operator intervenes.`);
            return Promise.resolve();
          }
          console.log(`Reattempting Postgres connection in ${delay/1000}s... (attempt ${attempt+1}/${MAX_RETRIES})`);
          return new Promise(res => setTimeout(res, delay)).then(() => adapter.connectWithRetry(attempt+1));
        });
      } catch (ex) {
        console.error('Postgres connect exception', ex && ex.message ? ex.message : ex);
        if (attempt >= (process.env.MAX_DB_RETRIES ? Number(process.env.MAX_DB_RETRIES) : 5)) {
          console.error('[DB ADAPTER] Postgres connect exception and reached max retries, aborting further attempts.');
          return Promise.resolve();
        }
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
      // If user or password appear empty, warn early
      if (!DB_USER || !DB_PASSWORD) {
        console.warn('[DB ADAPTER] DB_USER or DB_PASSWORD appears empty — ensure .env is configured correctly.');
      }

      nativeConn.connect((err) => {
        if (err) {
          // Helpful guidance for common auth errors
          if (err && err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('MySQL access denied (ER_ACCESS_DENIED_ERROR). It looks like the DB credentials are incorrect or the user lacks privileges.');
            console.error('Possible fixes:');
            console.error('  - Create a local database and user, then set LOCAL_DB_* env vars and enable DB_USE_LOCAL=true & ALLOW_LOCAL_DB=true');
            console.error('  - Update your .env with DB_USER and DB_PASSWORD. Example: DB_USER=myuser DB_PASSWORD=secret');
            console.error('  - SQL to run locally (see scripts/setup_local_db.sql):');
            console.error('      -- create database and user');
            console.error("      -- CREATE DATABASE dermatologico;");
            console.error("      -- CREATE USER 'appuser'@'localhost' IDENTIFIED BY 's3cret';");
            console.error("      -- GRANT ALL PRIVILEGES ON dermatologico.* TO 'appuser'@'localhost';");
            console.error('After creating the user, restart the server.');
            // Do not schedule automatic retries for credential errors — wait for operator to fix.
            return;
          }
          console.error('Error connecting to MySQL:', err);
          const MAX_RETRIES = process.env.MAX_DB_RETRIES ? Number(process.env.MAX_DB_RETRIES) : 5;
          if (attempt >= MAX_RETRIES) {
            console.error(`[DB ADAPTER] Reached max retries (${MAX_RETRIES}) for MySQL. Giving up until operator intervenes.`);
            return;
          }
          console.log(`Retrying MySQL connection in ${delay/1000}s... (attempt ${attempt+1}/${MAX_RETRIES})`);
          setTimeout(() => adapter.connectWithRetry(attempt + 1), delay);
          return;
        }
        adapter.config = nativeConn.config || { database: DB_NAME };
        console.log('✅ Connected to MySQL', DB_HOST, DB_PORT, DB_NAME);
      });
      return Promise.resolve();
    } catch (ex) {
      console.error('MySQL connect exception', ex && ex.message ? ex.message : ex);
      const MAX_RETRIES = process.env.MAX_DB_RETRIES ? Number(process.env.MAX_DB_RETRIES) : 5;
      if (attempt >= MAX_RETRIES) {
        console.error('[DB ADAPTER] MySQL connect exception and reached max retries, aborting further attempts.');
        return Promise.resolve();
      }
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

// Expose a small helper used by startup diagnostics or by devs to inspect resolved config
adapter.getResolvedConfig = function() {
  return {
    dbType: DB_TYPE,
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER ? (DB_USER.length > 0 ? DB_USER : '(empty)') : '(unset)',
    database: DB_NAME,
    ssl: !!PG_SSL
  };
};

// Helper: test a single connection attempt and return a Promise
adapter.testConnectionOnce = function() {
  return new Promise((resolve) => {
    if (DB_TYPE === 'postgres') {
      const tmpPool = new Pool({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, ssl: PG_SSL ? { rejectUnauthorized: false } : false });
      tmpPool.query('SELECT 1').then(() => {
        tmpPool.end();
        resolve({ ok: true, dbType: 'postgres' });
      }).catch(err => {
        tmpPool.end();
        resolve({ ok: false, error: err && err.message ? err.message : err });
      });
      return;
    }
    // MySQL: create a short-lived connection
    const conn = mysql.createConnection({ host: DB_HOST, port: DB_PORT, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, connectTimeout: 5000 });
    conn.connect((err) => {
      if (err) {
        resolve({ ok: false, error: err && err.message ? err.message : err, code: err && err.code ? err.code : undefined });
        return;
      }
      conn.query('SELECT 1', (qerr) => {
        if (qerr) {
          conn.end();
          resolve({ ok: false, error: qerr && qerr.message ? qerr.message : qerr });
          return;
        }
        conn.end();
        resolve({ ok: true, dbType: 'mysql' });
      });
    });
  });
};
