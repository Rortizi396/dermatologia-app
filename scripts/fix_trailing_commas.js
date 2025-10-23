const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '../dermatologico-pg-no-fk.sql');
if (!fs.existsSync(file)) { console.error('File not found:', file); process.exit(1); }
let s = fs.readFileSync(file, 'utf8');
// Replace any comma immediately followed by optional whitespace and a closing parenthesis for CREATE TABLE blocks
// This is a conservative replace: only replaces ",\n)" or ",   )" patterns
s = s.replace(/,\s*\n\s*\)/g, '\n)');
fs.writeFileSync(file, s, 'utf8');
console.log('Fixed trailing commas in', file);
