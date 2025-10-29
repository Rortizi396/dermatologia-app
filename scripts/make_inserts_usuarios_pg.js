const fs = require('fs');
const inFile = 'dermatologico-usuarios-inserts.sql';
const outFile = 'inserts-usuarios-pg.sql';
if (!fs.existsSync(inFile)) { console.error('input file not found', inFile); process.exit(1); }
let s = fs.readFileSync(inFile, 'utf8');
s = s.replace(/`/g, '');
s = s.replace(/INSERT INTO usuarios VALUES/gi, 'INSERT INTO usuarios (idUsuarios, correo, contrasenia, Tipo, Estado) VALUES');
s = s.replace(/\)\s*;\s*$/m, ') ON CONFLICT DO NOTHING;');
fs.writeFileSync(outFile, s, 'utf8');
console.log('Wrote', outFile);
