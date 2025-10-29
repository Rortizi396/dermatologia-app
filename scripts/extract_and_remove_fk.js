const fs = require('fs');
const path = require('path');

const input = path.resolve(__dirname, '../dermatologico-pg.sql');
const outNoFK = path.resolve(__dirname, '../dermatologico-pg-no-fk.sql');
const outFKs = path.resolve(__dirname, '../create_indexes_fks.sql');

if (!fs.existsSync(input)) {
  console.error('Input file not found:', input);
  process.exit(1);
}

const src = fs.readFileSync(input, 'utf8');

// Regex to find CREATE TABLE blocks
const createTableRegex = /CREATE TABLE\s+([a-zA-Z0-9_\"]+)\s*\([\s\S]*?\)\s*;/gi;

let fks = [];
let nextFkId = 1;

// We'll build output by replacing each CREATE TABLE block after processing
let out = src.replace(createTableRegex, (block) => {
  // Extract table name from header
  const headerMatch = block.match(/^CREATE TABLE\s+([a-zA-Z0-9_\"]+)\s*\(/i);
  let tableName = headerMatch ? headerMatch[1].replace(/"/g, '') : null;
  if (!tableName) return block;

  // Split into lines and process
  const lines = block.split(/\r?\n/);
  const newLines = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // If line contains REFERENCES (FK inline) capture it
    if (/REFERENCES\s+/i.test(line)) {
      // Collect the full constraint line (may span multiple lines until a comma or closing paren)
      let fkLines = [line.trim()];
      // If line does not end with ',' or ')' keep grabbing next lines
      while (!/[,]?$/.test(fkLines[fkLines.length-1]) && i+1 < lines.length) {
        i++;
        fkLines.push(lines[i].trim());
      }
      const fkText = fkLines.join(' ');

      // Try to determine if constraint has a name
      const nameMatch = fkText.match(/CONSTRAINT\s+([a-zA-Z0-9_]+)\s+/i);
      let constraintName = nameMatch ? nameMatch[1] : `fk_${tableName}_${nextFkId++}`;

      // Convert the inline FK into an ALTER TABLE ADD CONSTRAINT statement
      // We will strip a trailing comma if present in fkText
      const cleanedFk = fkText.replace(/,$/, '').replace(/\s+/g, ' ').trim();

      // Build ALTER TABLE statement
      const alter = `ALTER TABLE ONLY ${tableName} ADD CONSTRAINT ${constraintName} ${cleanedFk.replace(/^CONSTRAINT\s+[a-zA-Z0-9_]+\s+/i, '')} NOT VALID;`;
      fks.push(alter);
      // skip adding this line to newLines (effectively removing FK from CREATE TABLE)
      continue;
    }

    newLines.push(line);
  }

  return newLines.join('\n');
});

// Append FK statements to separate file
let fkFileContent = '-- Auto-generated FK constraints (NOT VALID). Review before validating.\n';
fkFileContent += fks.join('\n') + '\n';

fs.writeFileSync(outNoFK, out, 'utf8');
fs.writeFileSync(outFKs, fkFileContent, 'utf8');

console.log('Wrote:', outNoFK);
console.log('Wrote:', outFKs);
