#!/usr/bin/env node
/**
 * compare_and_sync.js
 *
 * Validates Postgres FK constraints (those added as NOT VALID) and then
 * compares row counts between MySQL and Postgres. For tables where MySQL
 * has more rows, the script will copy missing rows from MySQL into Postgres
 * using the table primary key(s).
 *
 * Assumptions / notes:
 * - MySQL connection params: MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DB
 * - Postgres connection params: PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DB
 * - Tables without a PRIMARY KEY are skipped and reported for manual sync.
 * - For very large tables this script may need adaptation (streaming/batching).
 */

const mysql = require('mysql2/promise');
const { Pool } = require('pg');

const MYSQL_HOST = process.env.MYSQL_HOST || process.env.DB_HOST || 'localhost';
const MYSQL_PORT = process.env.MYSQL_PORT || 3306;
const MYSQL_USER = process.env.MYSQL_USER || process.env.DB_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || 'root';
const MYSQL_DB = process.env.MYSQL_DB || process.env.DB_NAME || 'dermatologico';

const PG_HOST = process.env.PG_HOST || process.env.DB_HOST || 'localhost';
const PG_PORT = process.env.PG_PORT || 5432;
const PG_USER = process.env.PG_USER || process.env.DB_USER || 'postgres';
const PG_PASSWORD = process.env.PG_PASSWORD || process.env.DB_PASSWORD || 'root';
const PG_DB = process.env.PG_DB || process.env.DB_NAME || 'dermatologico_pg';

async function validatePostgresConstraints(pgPool) {
  console.log('\n== Validating Postgres FK constraints (those NOT VALID) ==');
  const client = await pgPool.connect();
  try {
    const res = await client.query("SELECT conrelid::regclass AS table_name, conname FROM pg_constraint WHERE contype='f' AND NOT convalidated;");
    if (res.rows.length === 0) {
      console.log('No NOT VALID foreign key constraints found.');
      return { validated: [], failed: [] };
    }

    const validated = [];
    const failed = [];
    for (const row of res.rows) {
      const table = row.table_name;
      const cname = row.conname;
      const sql = `ALTER TABLE ONLY ${table} VALIDATE CONSTRAINT ${cname};`;
      process.stdout.write(`Validating ${table} -> ${cname} ... `);
      try {
        await client.query(sql);
        console.log('OK');
        validated.push({ table, constraint: cname });
      } catch (err) {
        console.log('FAIL');
        console.error(err.message.split('\n')[0]);
        failed.push({ table, constraint: cname, error: err.message });
      }
    }
    return { validated, failed };
  } finally {
    client.release();
  }
}

async function getPostgresTableCounts(pgPool) {
  const client = await pgPool.connect();
  try {
    const tablesRes = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name");
    const out = {};
    for (const r of tablesRes.rows) {
      const t = r.table_name;
      const qr = await client.query(`SELECT COUNT(*) AS cnt FROM public."${t}"`);
      out[t] = Number(qr.rows[0].cnt);
    }
    return out;
  } finally {
    client.release();
  }
}

async function getMySqlTableCounts(mysqlConn) {
  const [tables] = await mysqlConn.query("SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_type='BASE TABLE' ORDER BY table_name", [MYSQL_DB]);
  const out = {};
  for (const r of tables) {
    const t = r.TABLE_NAME || r.table_name;
    const [cntRes] = await mysqlConn.query(`SELECT COUNT(*) AS cnt FROM \`${t}\``);
    out[t] = Number(cntRes[0].cnt);
  }
  return out;
}

async function getPrimaryKeyColumns(mysqlConn, table) {
  // Returns array of column names composing primary key, or [] if none
  const [rows] = await mysqlConn.query("SHOW KEYS FROM ?? WHERE Key_name = 'PRIMARY'", [table]);
  if (!rows || rows.length === 0) return [];
  // rows may have Seq_in_index for order
  return rows.sort((a,b)=>a.Seq_in_index - b.Seq_in_index).map(r => r.Column_name);
}

function chunkArray(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function syncMissingRows(mysqlConn, pgPool, table, pkCols) {
  if (pkCols.length === 0) {
    console.log(`Skipping ${table}: no primary key detected.`);
    return { skipped: true };
  }
  console.log(`\nSyncing table ${table} on PK (${pkCols.join(',')})`);

  // get PK values present in Postgres
  const client = await pgPool.connect();
  try {
  // Postgres stores unquoted identifiers in lowercase. Map PK column names to lowercase
  const pgPkCols = pkCols.map(c => c.toLowerCase());
  const selectPgPk = `SELECT ${pgPkCols.map(c=>`"${c}"`).join(',')} FROM public."${table}"`;
  const res = await client.query(selectPgPk);
  const pgPkRows = res.rows; // array of objects with lowercase keys
  const pgKeySet = new Set(pgPkRows.map(r => pgPkCols.map(c => String(r[c])).join('||')));

    // fetch all rows from MySQL and filter those missing in PG
    const [mysqlRows] = await mysqlConn.query(`SELECT * FROM \`${table}\``);
    const missing = [];
    for (const r of mysqlRows) {
      const key = pkCols.map(c => String(r[c])).join('||');
      if (!pgKeySet.has(key)) missing.push(r);
    }

    console.log(`Found ${missing.length} missing rows for ${table}`);
    if (missing.length === 0) return { inserted: 0 };

    // prepare insert statement
  const columns = Object.keys(missing[0]);
  // target Postgres column names are lowercase
  const pgColumns = columns.map(c => c.toLowerCase());
  const colList = pgColumns.map(c => `"${c}"`).join(',');
    const paramPlaceholders = columns.map((_,i)=>`$${i+1}`).join(',');
  const insertSql = `INSERT INTO public."${table}"(${colList}) VALUES (${paramPlaceholders}) ON CONFLICT DO NOTHING`;

    let inserted = 0;
    // batch inserts
    const batch = 200; // safe batch size
    const chunks = chunkArray(missing, batch);
    for (const ch of chunks) {
      const trx = await client.query('BEGIN');
      try {
        for (const row of ch) {
          const vals = columns.map(c => row[c]);
          await client.query(insertSql, vals);
          inserted++;
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error inserting chunk:', err.message.split('\n')[0]);
        // fall back to single-row inserts
        for (const row of ch) {
          try {
            const vals = columns.map(c => row[c]);
            await client.query(insertSql, vals);
            inserted++;
          } catch (err2) {
            console.error('Row insert failed:', err2.message.split('\n')[0]);
          }
        }
      }
    }

    return { inserted };
  } finally {
    client.release();
  }
}

async function main() {
  console.log('compare_and_sync: starting with configs:');
  console.log({ MYSQL_HOST, MYSQL_PORT, MYSQL_DB, PG_HOST, PG_PORT, PG_DB });

  const mysqlConn = await mysql.createConnection({ host: MYSQL_HOST, port: MYSQL_PORT, user: MYSQL_USER, password: MYSQL_PASSWORD, database: MYSQL_DB, multipleStatements: true });
  // configure PG connection; enable SSL for Render-managed Postgres
  const pgConfig = { host: PG_HOST, port: PG_PORT, user: PG_USER, password: PG_PASSWORD, database: PG_DB };
  if (process.env.PG_SSL === 'true' || (PG_HOST && PG_HOST.includes('render'))) {
    pgConfig.ssl = { rejectUnauthorized: false };
  }
  const pgPool = new Pool(pgConfig);

  try {
    // 1) Validate constraints
    const { validated, failed } = await validatePostgresConstraints(pgPool);
    console.log('\nValidation summary:');
    console.log('Validated:', validated.length, 'Failed:', failed.length);
    if (failed.length > 0) {
      console.log('Failed constraint validations (first 5):', failed.slice(0,5));
    }

    // 2) Compare table counts
    console.log('\nGathering table counts from Postgres...');
    const pgCounts = await getPostgresTableCounts(pgPool);
    console.log('Gathering table counts from MySQL...');
    const myCounts = await getMySqlTableCounts(mysqlConn);

    // compare
    const tables = Array.from(new Set([...Object.keys(pgCounts), ...Object.keys(myCounts)])).sort();
    const diffs = [];
    for (const t of tables) {
      const pgc = pgCounts[t] || 0;
      const myc = myCounts[t] || 0;
      if (myc !== pgc) diffs.push({ table: t, mysql: myc, postgres: pgc });
    }

    console.log('\nTables with differing counts:', diffs.length);
    diffs.forEach(d => console.log(`${d.table}: mysql=${d.mysql} postgres=${d.postgres}`));

    // 3) For each table where MySQL has more rows, attempt to sync missing rows
    let totalInserted = 0;
    for (const d of diffs) {
      if (d.mysql > d.postgres) {
        const pkCols = await getPrimaryKeyColumns(mysqlConn, d.table);
        const res = await syncMissingRows(mysqlConn, pgPool, d.table, pkCols);
        if (res && res.inserted) {
          console.log(`Inserted ${res.inserted} rows into ${d.table}`);
          totalInserted += res.inserted;
        }
      } else {
        console.log(`Table ${d.table} has more rows in Postgres (${d.postgres}) than MySQL (${d.mysql}) - skipping`);
      }
    }

    console.log(`\nDone. Total rows inserted into Postgres: ${totalInserted}`);
    console.log('If some tables were skipped due to missing primary keys, review them manually.');
  } catch (err) {
    console.error('Fatal error:', err.message);
  } finally {
    try { await mysqlConn.end(); } catch(e){}
    try { await pgPool.end(); } catch(e){}
  }
}

main();
