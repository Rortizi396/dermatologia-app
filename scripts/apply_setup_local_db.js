const fs = require('fs');
const path = require('path');
const mysql = require('mysql2');

const sqlPath = path.join(__dirname, 'setup_local_db.sql');
if (!fs.existsSync(sqlPath)) {
  console.error('SQL file not found:', sqlPath);
  process.exit(2);
}

const sql = fs.readFileSync(sqlPath, 'utf8');

// Resolve connection settings from env (fall back to root/no-password)
const host = process.env.LOCAL_DB_HOST || process.env.DB_HOST || 'localhost';
const port = process.env.LOCAL_DB_PORT ? Number(process.env.LOCAL_DB_PORT) : (process.env.DB_PORT ? Number(process.env.DB_PORT) : 3306);
const user = process.env.LOCAL_DB_USER || process.env.DB_USER || 'root';
const password = process.env.LOCAL_DB_PASSWORD || process.env.DB_PASSWORD || '';

console.log('Connecting to MySQL', { host, port, user: user === '' ? '(empty)' : user });

const conn = mysql.createConnection({
  host, port, user, password,
  multipleStatements: true,
  connectTimeout: 10000
});

conn.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err && err.message ? err.message : err);
    if (err && err.code === 'ER_ACCESS_DENIED_ERROR') process.exit(3);
    process.exit(1);
  }
  console.log('Connected. Executing SQL script...');
  conn.query(sql, function(qerr, results) {
    if (qerr) {
      console.error('Error executing SQL:', qerr && qerr.message ? qerr.message : qerr);
      conn.end();
      process.exit(4);
    }
    console.log('SQL script executed successfully.');
    conn.end(() => process.exit(0));
  });
});
