const fs = require('fs');
const path = require('path');

const input = path.resolve(__dirname, '../dermatologico-mysql.sql');
const output = path.resolve(__dirname, '../create_indexes_fks.sql');

if (!fs.existsSync(input)) {
  console.error('Input dump not found:', input);
  process.exit(1);
}

const src = fs.readFileSync(input, 'utf8');
const createTableRegex = /CREATE TABLE\s+`?([A-Za-z0-9_]+)`?\s*\((([\s\S]*?))\)\s*;/gi;
let match;
const statements = [];

while ((match = createTableRegex.exec(src)) !== null) {
  const table = match[1];
  const body = match[2];
  const lines = body.split(/\r?\n/);
  for (let ln of lines) {
    ln = ln.trim();
    // KEY / INDEX lines
    let m = ln.match(/^(UNIQUE\s+KEY|UNIQUE\s+INDEX|KEY|INDEX)\s+`?([A-Za-z0-9_]+)`?\s*\(([^)]+)\)/i);
    if (m) {
      const kind = m[1].toUpperCase();
      const idxName = m[2];
      const cols = m[3].replace(/`/g, '').trim();
      if (/UNIQUE/i.test(kind)) {
        statements.push(`CREATE UNIQUE INDEX IF NOT EXISTS ${idxName} ON ${table} (${cols});`);
      } else {
        statements.push(`CREATE INDEX IF NOT EXISTS ${idxName} ON ${table} (${cols});`);
      }
      continue;
    }
    // CONSTRAINT / FOREIGN KEY lines
    m = ln.match(/^(CONSTRAINT\s+`?([A-Za-z0-9_]+)`?\s+)?FOREIGN KEY\s*\(([^)]+)\)\s+REFERENCES\s+`?([A-Za-z0-9_]+)`?\s*\(([^)]+)\)(.*)$/i);
    if (m) {
      const constraintName = m[2] || `${table}_fk_${Math.random().toString(36).slice(2,8)}`;
      const localCols = m[3].replace(/`/g, '').trim();
      const refTable = m[4];
      const refCols = m[5].replace(/`/g, '').trim();
      const rest = m[6] || '';
      // convert ON DELETE/ON UPDATE clauses (leave them as-is if present)
      const onClauses = (rest.match(/ON DELETE\s+\w+/i) || []).concat(rest.match(/ON UPDATE\s+\w+/i) || []).join(' ');
      statements.push(`ALTER TABLE ${table} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${localCols}) REFERENCES ${refTable} (${refCols}) ${onClauses};`);
      continue;
    }
  }
}

fs.writeFileSync(output, statements.join('\n') + '\n', 'utf8');
console.log('Wrote', output, 'with', statements.length, 'statements');
