// Small runner to set environment variables (avoid PowerShell quoting issues)
process.env.MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
process.env.MYSQL_PORT = process.env.MYSQL_PORT || '3306';
process.env.MYSQL_USER = process.env.MYSQL_USER || 'root';
process.env.MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || 'root';
process.env.MYSQL_DB = process.env.MYSQL_DB || 'dermatologico';

// Force PG env vars to the Render Postgres credentials so the script connects remotely
process.env.PG_HOST = 'dpg-d3rfvdndiees73blt260-a.oregon-postgres.render.com';
process.env.PG_PORT = '5432';
process.env.PG_USER = 'dermatologico_pg_user';
process.env.PG_PASSWORD = '0f2nxveb93XMKmbwM8kZWVSWFKbFkmeQ';
process.env.PG_DB = 'dermatologico_pg';

console.log('Starting compare_and_sync with env:');
console.log({ MYSQL_HOST: process.env.MYSQL_HOST, MYSQL_PORT: process.env.MYSQL_PORT, MYSQL_DB: process.env.MYSQL_DB, PG_HOST: process.env.PG_HOST, PG_DB: process.env.PG_DB });

require('./compare_and_sync.js');
