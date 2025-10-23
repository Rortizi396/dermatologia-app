const fs = require('fs');
const iconv = require('iconv-lite');
const inFile = 'dermatologico-usuarios-inserts.sql';
const outFile = 'inserts-usuarios-pg.sql';
if (!fs.existsSync(inFile)) { console.error('input file not found', inFile); process.exit(1); }
const buf = fs.readFileSync(inFile);
let str = null;
// try UTF-8 first
if (buf[0] === 0xFF && buf[1] === 0xFE) {
  // UTF-16 LE
  str = iconv.decode(buf, 'utf16-le');
} else if (buf[0] === 0xFE && buf[1] === 0xFF) {
  str = iconv.decode(buf, 'utf16-be');
} else {
  // assume utf8
  str = buf.toString('utf8');
}
// transform
str = str.replace(/`/g, '');
str = str.replace(/INSERT INTO usuarios VALUES/gi, 'INSERT INTO usuarios (idUsuarios, correo, contrasenia, Tipo, Estado) VALUES');
str = str.replace(/\)\s*;\s*$/m, ') ON CONFLICT DO NOTHING;');
fs.writeFileSync(outFile, str, { encoding: 'utf8' });
console.log('Wrote normalized', outFile);
