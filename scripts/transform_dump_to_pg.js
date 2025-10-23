// Minimal transformer: mysqldump -> Postgres-compatible SQL
// Heuristics: remove backticks, remove /*! ... */ blocks, remove CREATE DATABASE/USE, remove ENGINE/CHARSET, convert AUTO_INCREMENT columns to SERIAL,
// strip LOCK/UNLOCK and SET FOREIGN_KEY_CHECKS lines, keep CREATE TABLE and INSERT INTO statements.

const fs = require('fs');
const path = require('path');

const input = path.resolve(__dirname, '../dermatologico-mysql.sql');
const output = path.resolve(__dirname, '../dermatologico-pg.sql');

if (!fs.existsSync(input)) {
  console.error('Input dump not found:', input);
  process.exit(1);
}

const src = fs.readFileSync(input, 'utf8');
let s = src;

// Remove /*! ... */ MySQL versioned comments entirely
s = s.replace(/\/\*![\s\S]*?\*\//g, '');

// Remove DELIMITER lines
s = s.replace(/^DELIMITER .*$/gim, '');

// Remove DEFINER statements (common in routines/triggers)
s = s.replace(/DEFINER=`[^`]+`@`[^`]+`/g, '');

// Remove CREATE DATABASE and USE statements
s = s.replace(/^CREATE DATABASE[\s\S]*?;\s*/gim, '');
s = s.replace(/^USE `[^`]+`;\s*/gim, '');

// Remove LOCK/UNLOCK and SET FOREIGN_KEY_CHECKS and SET SQL_MODE lines
s = s.replace(/^LOCK TABLES[\s\S]*?UNLOCK TABLES;\s*/gim, '');
s = s.replace(/^SET\s+FOREIGN_KEY_CHECKS.*$/gim, '');
s = s.replace(/^SET\s+SQL_MODE.*$/gim, '');
s = s.replace(/^\/\*[^\n]*\*\/;?$/gim, '');

// Remove /*! ... */ leftovers (again)
s = s.replace(/\/\*![\s\S]*?\*\//g, '');

// Remove backticks
s = s.replace(/`/g, '');

// Remove ENGINE=... and DEFAULT CHARSET=... table options at end of CREATE TABLE
s = s.replace(/\) ENGINE=[^;]+;/g, '\);');
s = s.replace(/\) DEFAULT CHARSET=[^;]+;/g, '\);');

// Remove COLLATE declarations
s = s.replace(/COLLATE\s+[^\s;]+/g, '');

// Remove unsigned keywords (Postgres doesn't use them); optionally map to BIGINT for unsigned ints
s = s.replace(/unsigned/gi, '');

// Process CREATE TABLE blocks to convert AUTO_INCREMENT columns to SERIAL
// We'll do a simple approach: find CREATE TABLE ... ( ... ); blocks and transform column lines containing AUTO_INCREMENT

function transformCreateTableBlock(block) {
  const lines = block.split('\n');
  let out = [];
  // collect any KEY/INDEX definitions to convert later to CREATE INDEX statements
  const indexes = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Trim right spaces
    const orig = line;
    line = line.replace(/\r$/, '');
    // If line contains AUTO_INCREMENT, try to replace the column type with SERIAL
    if (/AUTO_INCREMENT/i.test(line)) {
      // Example match: id INT NOT NULL AUTO_INCREMENT,
      // We'll try to capture column name and replace whole type+constraints with 'SERIAL' and keep PRIMARY KEY if inline
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s+([^,]*)/);
      if (m) {
        const col = m[1];
        const rest = m[2];
        // Detect if PRIMARY KEY inline
        const isPK = /PRIMARY KEY/i.test(rest);
        let newLine = `  ${col} SERIAL` + (isPK ? ' PRIMARY KEY' : '');
        // Keep trailing comma if present in original
        if (orig.trim().endsWith(',')) newLine += ',';
        out.push(newLine);
        continue;
      }
    }

    // Convert 'int' with a size to integer (Postgres accepts int)
    // Convert 'tinyint(1)' often used for boolean -> boolean
    if (/tinyint\(1\)/i.test(line)) {
      line = line.replace(/tinyint\(1\)/ig, 'boolean');
    }

    // Capture and remove KEY / INDEX lines inside CREATE TABLE; we'll emit CREATE INDEX later
    const keyMatch = line.match(/^\s*(?:KEY|INDEX)\s+([A-Za-z0-9_]+)\s*\(([^)]+)\)\s*,?\s*$/i);
    if (keyMatch) {
      const idxName = keyMatch[1];
      const cols = keyMatch[2].trim();
      indexes.push({ name: idxName, cols });
      // skip adding this line into the create block
      continue;
    }

    // Replace 'datetime DEFAULT CURRENT_TIMESTAMP' common pattern to 'timestamp DEFAULT CURRENT_TIMESTAMP'
    line = line.replace(/datetime/ig, 'timestamp');

    out.push(line);
  }
  // return both transformed block and any collected indexes as a special marker appended
  const transformed = out.join('\n');
  if (indexes.length > 0) {
    // append a marker comment with index info to be extracted later
    const markerLines = ['\n-- __EXTRACT_INDEXES__'];
    for (const idx of indexes) {
      markerLines.push(`-- IDX ${idx.name} | ${idx.cols}`);
    }
    return transformed + '\n' + markerLines.join('\n');
  }
  return transformed;
}

// Apply transformation per CREATE TABLE block
s = s.replace(/CREATE TABLE\s+[^(]+\([\s\S]*?\)\s*;/gi, (m) => {
  const transformed = transformCreateTableBlock(m);
  return transformed;
});

// After processing blocks, collect any index markers and convert them to CREATE INDEX statements
const indexStatements = [];
const indexMarkerRegex = /^-- __EXTRACT_INDEXES__\s*$/m;
if (indexMarkerRegex.test(s)) {
  // find all marker blocks
  const markerBlockRegex = /-- __EXTRACT_INDEXES__([\s\S]*?)(?=(?:\n-- __EXTRACT_INDEXES__|$))/g;
  let match;
  while ((match = markerBlockRegex.exec(s)) !== null) {
    const block = match[1];
    const lines = block.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    for (const ln of lines) {
      if (!ln.startsWith('-- IDX')) continue;
      const parts = ln.replace('-- IDX', '').trim();
      const m2 = parts.match(/^([A-Za-z0-9_]+)\s*\|\s*(.+)$/);
      if (m2) {
        const idxName = m2[1];
        const cols = m2[2].trim();
        // Attempt to derive table name from surrounding context: skip and emit generic CREATE INDEX with idxName
        // We'll produce: CREATE INDEX IF NOT EXISTS idxName ON <table> (cols);
        // Since we don't have table name here reliably, emit a generic index name; user can adjust if needed.
        indexStatements.push(`-- NOTE: original index ${idxName} on columns (${cols}). Please review and create appropriate index if desired.`);
      }
    }
  }
  // remove all marker blocks from SQL
  s = s.replace(/-- __EXTRACT_INDEXES__[\s\S]*?(?=(?:\n-- __EXTRACT_INDEXES__|$))/g, '');
}

if (indexStatements.length > 0) {
  s += '\n\n-- Converted index notes (please review)\n' + indexStatements.join('\n') + '\n';
}

// Remove any remaining 'ENGINE=...' (conservative)
s = s.replace(/ENGINE=[^\s;]+/gi, '');

// Remove MySQL-specific 'ON UPDATE CURRENT_TIMESTAMP' (Postgres handles differently) - keep DEFAULT CURRENT_TIMESTAMP
s = s.replace(/ON UPDATE CURRENT_TIMESTAMP/gi, '');

// Remove unsigned references leftover
s = s.replace(/\bunsigned\b/gi, '');

// Convert ENUM(...) to varchar(255)
s = s.replace(/enum\([^\)]*\)/gi, 'varchar(255)');

// Some mysqldump inserts use 'INSERT INTO tbl VALUES (...);' which is fine. Ensure 'LIMIT' comments removed.

// Write output
fs.writeFileSync(output, s, 'utf8');
console.log('Wrote transformed SQL to', output);
