// Startup diagnostics: print current working directory and presence of key files
// This helps pinpoint Render misconfiguration (wrong Service Root Directory
// or missing `node_modules`) when the server fails early with module errors.
try {
  const fs = require('fs');
  console.log('[STARTUP] process.cwd():', process.cwd());
  console.log('[STARTUP] __dirname:', __dirname);
  console.log('[STARTUP] package.json in cwd?:', fs.existsSync(require('path').join(process.cwd(), 'package.json')));
  console.log('[STARTUP] package-lock.json in cwd?:', fs.existsSync(require('path').join(process.cwd(), 'package-lock.json')));
  console.log('[STARTUP] package.json in __dirname?:', fs.existsSync(require('path').join(__dirname, 'package.json')));
  console.log('[STARTUP] package-lock.json in __dirname?:', fs.existsSync(require('path').join(__dirname, 'package-lock.json')));
  console.log('[STARTUP] node_modules exists in cwd?:', fs.existsSync(require('path').join(process.cwd(), 'node_modules')));
  console.log('[STARTUP] node_modules exists in __dirname?:', fs.existsSync(require('path').join(__dirname, 'node_modules')));
  console.log('[STARTUP] node_modules/cors exists in cwd?:', fs.existsSync(require('path').join(process.cwd(), 'node_modules', 'cors')));
  console.log('[STARTUP] node_modules/cors exists in __dirname?:', fs.existsSync(require('path').join(__dirname, 'node_modules', 'cors')));
} catch (diagErr) {
  // If diagnostics fail, still continue — don't block startup.
  try { console.warn('[STARTUP] diagnostics failed:', String(diagErr)); } catch (_) {}
}

const express = require('express');
const mysql = require('mysql2');
let cors;
try {
  cors = require('cors');
} catch (e) {
  // Log a descriptive error so Render logs show the missing module and the
  // current working dir; provide a harmless fallback middleware so the
  // process doesn't crash immediately and logs remain visible.
  console.error('[STARTUP] failed to require("cors"): ', e && e.message ? e.message : e);
  console.error('[STARTUP] This usually means `node_modules` is not present in the directory where Render started the process.');
  cors = function /* fallback-cors */(opts) {
    console.warn('[STARTUP] using fallback CORS middleware (no-op)');
    return (req, res, next) => next();
  };
}
// ...existing code...

// ...existing code...
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// Configurable CORS origins via environment variable CORS_ORIGINS (comma-separated).
// We apply CORS early (before body parsing) so that preflight responses and
// any JSON parse errors still include the proper CORS headers.
// If not set, default to localhost:4200 for development. We also include the
// typical GitHub Pages origin used for frontend hosting so the publicly
// deployed UI can call this API without editing Render env vars locally.
// Use '*' to allow all origins (not recommended for production).
const corsOriginsEnv = process.env.CORS_ORIGINS || 'http://localhost:4200,https://rortizi396.github.io';
const allowedOrigins = corsOriginsEnv.split(',').map(o => o.trim()).filter(Boolean);

// Build a reusable CORS options object so we can apply it to both the
// regular middleware and the preflight (OPTIONS) handler. We explicitly
// allow the Authorization header so browser preflights won't block
// requests that include the Bearer token.
const corsOptions = {
  origin: function(origin, callback) {
    // Allow non-browser (server-to-server) requests with no origin
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return callback(null, true);
    console.warn('[CORS] Rejected origin:', origin);
    return callback(new Error('CORS policy: origin not allowed'), false);
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept'],
  // Expose Authorization and other headers to the browser if needed
  exposedHeaders: ['Authorization']
};

app.use(cors(corsOptions));
// Explicitly handle OPTIONS preflight with same CORS options and end with 204
// This ensures browsers receive Access-Control-Allow-* headers even if no
// downstream route matches the OPTIONS method.
// Note: We avoid app.options catch-all routes in Express 5 (path-to-regexp v8)
// to prevent pattern parsing errors. Instead, handle OPTIONS below via middleware.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    try {
      return cors(corsOptions)(req, res, () => res.sendStatus(204));
    } catch (_) {
      return res.sendStatus(204);
    }
  }
  next();
});

// Middleware para parsear JSON antes de los endpoints
app.use(express.json());

// Registrador simple de peticiones para depuración
app.use((req, res, next) => {
  try {
    console.log(`[REQ] ${req.method} ${req.originalUrl}`);
    // Don't print bodies for GET/HEAD; for others, print a short preview
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      let preview = '';
      try { preview = JSON.stringify(req.body).slice(0, 100); } catch(e) { preview = '[unserializable]'; }
      console.log(`[REQ BODY PREVIEW] ${preview}`);
    }
  } catch (ex) {
    console.warn('[REQ LOG ERROR]', ex);
  }
  next();
});




// Database adapter (supports mysql and postgres)
const db = require('./db/connection');

// Connect with retry/backoff to avoid exiting when DB is still initializing.
function connectWithRetry(attempt = 0) {
  return db.connectWithRetry(attempt).then(() => {
    console.log(`✅ Conectado a la base de datos (${db.dbType}) ${db.config.database}`);

    const skipInit = (process.env.SKIP_DB_INIT || '').toString().toLowerCase() === 'true';
    if (skipInit) {
      console.log('[DB INIT] SKIP_DB_INIT=true -> skipping database initialization and seeding');
      return;
    }

    // Ensure required tables exist (only when SKIP_DB_INIT is not set)
    if (db.dbType === 'mysql') {
      const createSettings = `
      CREATE TABLE IF NOT EXISTS site_settings (
        ` + "`key`" + ` VARCHAR(100) PRIMARY KEY,
        value TEXT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      db.query(createSettings, (err) => { if (err) console.warn('Warning: could not ensure site_settings table:', err); });

      const createSettingsAudit = `
      CREATE TABLE IF NOT EXISTS site_settings_audit (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        ` + "`key`" + ` VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        changed_by VARCHAR(255),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      db.query(createSettingsAudit, (err) => { if (err) console.warn('Warning: could not ensure site_settings_audit table:', err); });

      const createUserPrefs = `
      CREATE TABLE IF NOT EXISTS user_preferences (
        userId VARCHAR(100),
        key_name VARCHAR(100),
        value TEXT,
        PRIMARY KEY (userId, key_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      db.query(createUserPrefs, (err) => { if (err) console.warn('Warning: could not ensure user_preferences table:', err); });

      const createAuditLog = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(100),
        resource_type VARCHAR(100),
        resource_id VARCHAR(255),
        old_value TEXT,
        new_value TEXT,
        changed_by VARCHAR(255),
        ip VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      db.query(createAuditLog, (err) => { if (err) console.warn('Warning: could not ensure audit_log table:', err); });

      const createUsuarios = `
      CREATE TABLE IF NOT EXISTS Usuarios (
        idUsuarios INT AUTO_INCREMENT PRIMARY KEY,
        correo VARCHAR(255) UNIQUE,
        contrasenia VARCHAR(255),
        Tipo VARCHAR(50),
        Nombres VARCHAR(255),
        Apellidos VARCHAR(255),
        Activo VARCHAR(5) DEFAULT 'SI'
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`;
      db.query(createUsuarios, (err) => {
        if (err) { console.warn('[DB INIT] could not ensure Usuarios table:', err); return; }
        // If table empty, insert a seeded user for testing
        db.query('SELECT COUNT(*) AS cnt FROM Usuarios', (e, rows) => {
          if (e) return console.warn('[DB INIT] count Usuarios failed:', e);
          const cnt = (rows && rows[0] && rows[0].cnt) ? Number(rows[0].cnt) : 0;
          if (cnt === 0) {
            const seedEmail = 'carlos@ejemplo.com';
            const seedPassword = 'admin123';
            bcrypt.hash(seedPassword, 10, (hashErr, hash) => {
              if (hashErr) return console.warn('[DB INIT] bcrypt hash failed:', hashErr);
              db.query('INSERT INTO Usuarios (correo, contrasenia, Tipo, Nombres, Apellidos, Activo) VALUES (?,?,?,?,?,?)', [seedEmail, hash, 'Administrador', 'Carlos', 'Ejemplo', 'SI'], (insErr) => {
                if (insErr) return console.warn('[DB INIT] insert seed user failed:', insErr);
                console.log(`[DB INIT] Seed user created: ${seedEmail} / ${seedPassword}`);
              });
            });
          }
        });
      });
    } else {
      // Postgres DDL variants
      const createSettings = `
      CREATE TABLE IF NOT EXISTS site_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT
      );`;
      db.query(createSettings, (err) => { if (err) console.warn('Warning: could not ensure site_settings table (pg):', err); });

      const createSettingsAudit = `
      CREATE TABLE IF NOT EXISTS site_settings_audit (
        id BIGSERIAL PRIMARY KEY,
        key VARCHAR(100),
        old_value TEXT,
        new_value TEXT,
        changed_by VARCHAR(255),
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`;
      db.query(createSettingsAudit, (err) => { if (err) console.warn('Warning: could not ensure site_settings_audit table (pg):', err); });

      const createUserPrefs = `
      CREATE TABLE IF NOT EXISTS user_preferences (
        userId VARCHAR(100),
        key_name VARCHAR(100),
        value TEXT,
        PRIMARY KEY (userId, key_name)
      );`;
      db.query(createUserPrefs, (err) => { if (err) console.warn('Warning: could not ensure user_preferences table (pg):', err); });

      const createAuditLog = `
      CREATE TABLE IF NOT EXISTS audit_log (
        id BIGSERIAL PRIMARY KEY,
        event_type VARCHAR(100),
        resource_type VARCHAR(100),
        resource_id VARCHAR(255),
        old_value TEXT,
        new_value TEXT,
        changed_by VARCHAR(255),
        ip VARCHAR(100),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`;
      db.query(createAuditLog, (err) => { if (err) console.warn('Warning: could not ensure audit_log table (pg):', err); });

      const createUsuarios = `
      CREATE TABLE IF NOT EXISTS Usuarios (
        idUsuarios SERIAL PRIMARY KEY,
        correo VARCHAR(255) UNIQUE,
        contrasenia VARCHAR(255),
        Tipo VARCHAR(50),
        Nombres VARCHAR(255),
        Apellidos VARCHAR(255),
        Activo VARCHAR(5) DEFAULT 'SI'
      );`;
      db.query(createUsuarios, (err) => {
        if (err) { console.warn('[DB INIT] could not ensure Usuarios table (pg):', err); return; }
        db.query('SELECT COUNT(*) AS cnt FROM Usuarios', (e, rows) => {
          if (e) return console.warn('[DB INIT] count Usuarios failed (pg):', e);
          const cnt = (rows && rows[0] && (rows[0].cnt || rows[0].count)) ? Number(rows[0].cnt || rows[0].count) : 0;
          if (cnt === 0) {
            const seedEmail = 'carlos@ejemplo.com';
            const seedPassword = 'admin123';
            bcrypt.hash(seedPassword, 10, (hashErr, hash) => {
              if (hashErr) return console.warn('[DB INIT] bcrypt hash failed (pg):', hashErr);
              db.query('INSERT INTO Usuarios (correo, contrasenia, Tipo, Nombres, Apellidos, Activo) VALUES ($1, $2, $3, $4, $5, $6)', [seedEmail, hash, 'Administrador', 'Carlos', 'Ejemplo', 'SI'], (insErr) => {
                if (insErr) return console.warn('[DB INIT] insert seed user failed (pg):', insErr);
                console.log(`[DB INIT] Seed user created: ${seedEmail} / ${seedPassword}`);
              });
            });
          }
        });
      });
    }

    // NOTE: MySQL-specific DDL blocks (AUTO_INCREMENT/ENGINE) were removed here
    // because the DB-type-specific branches above already ensure the tables
    // for both MySQL and Postgres. Leaving MySQL-only CREATE statements here
    // caused syntax errors when running against Postgres (e.g. AUTO_INCREMENT).
  });
}

connectWithRetry();

// Función auxiliar para insertar registros de auditoría
function insertAudit(req, eventType, resourceType, resourceId, oldValue, newValue, cb) {
  try {
    let changedBy = null;
    try {
      const auth = req.headers && req.headers.authorization ? req.headers.authorization : null;
      if (auth && auth.toString().toLowerCase().startsWith('bearer ')) {
        const token = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
        changedBy = decoded.email || decoded.userId || null;
      }
    } catch (ex) {
      // ignore token errors for audit
    }
    const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress || '').toString();
    const ua = (req.headers['user-agent'] || '').toString();
    const sql = `INSERT INTO audit_log (event_type, resource_type, resource_id, old_value, new_value, changed_by, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    db.query(sql, [eventType, resourceType, resourceId ? String(resourceId) : null, oldValue, newValue, changedBy, ip, ua], (err, result) => {
      if (err) {
        console.error('[AUDIT] Failed to insert audit_log:', err);
        if (cb) return cb(err);
        return;
      }
      if (cb) return cb(null, result.insertId);
    });
  } catch (ex) {
    console.error('[AUDIT] Unexpected error in insertAudit:', ex);
    if (cb) cb(ex);
  }
}

// --- Middleware de Autenticación / Autorización (defensa en profundidad) ---
function authenticateToken(req, res, next) {
  try {
    const auth = req.headers && req.headers.authorization ? req.headers.authorization : null;
    if (!auth || !auth.toString().toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }
    const token = auth.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
      req.user = decoded;
      return next();
    } catch (exToken) {
      return res.status(401).json({ success: false, message: 'Invalid token', error: exToken && exToken.message ? exToken.message : exToken });
    }
  } catch (ex) {
    console.warn('[AUTH MIDDLEWARE] Unexpected error:', ex);
    return res.status(500).json({ success: false, message: 'Server error in auth middleware' });
  }
}

function authorizeRole(expected) {
  // expected can be a string or array of strings
  return (req, res, next) => {
    try {
      const user = req.user || null;
      if (!user) return res.status(403).json({ success: false, message: 'No autorizado' });
      const roles = Array.isArray(expected) ? expected : [expected];
      const userRole = ((user.tipo || user.role || user.tipo_usuario) || '').toString().toLowerCase();
      const normalized = roles.map(r => r.toString().toLowerCase());
      if (normalized.includes(userRole)) return next();
      return res.status(403).json({ success: false, message: 'No autorizado' });
    } catch (ex) {
      console.warn('[ROLE AUTH] unexpected', ex);
      return res.status(500).json({ success: false, message: 'Server error in role check' });
    }
  };
}

// Resolve a doctor identifier (numeric id or human code) to the value stored in the DB
function resolveProfessional(req, doctorIdentifier, cb) {
  // If null/undefined, return as-is
  if (typeof doctorIdentifier === 'undefined' || doctorIdentifier === null) return cb(null, null);
  const s = doctorIdentifier.toString();
  // If looks numeric, return numeric value (assume it's already DB-safe)
  if (/^\d+$/.test(s)) return cb(null, s);

  const schema = (db.config && db.config.database) ? db.config.database : 'dermatologico';
  const likeName = `%${s}%`;

  // First determine the data type of citas.Profesional_Responsable
  const colTypeSql = `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'Profesional_Responsable' LIMIT 1`;
  db.query(colTypeSql, [schema], (errType, typeRows) => {
    if (errType) {
      console.error('[RESOLVE PROFESSIONAL] error reading column type:', errType);
    // Volver al comportamiento anterior como reserva
      const q = `SELECT Colegiado FROM doctores WHERE Colegiado = ? OR Correo = ? OR CONCAT(Nombres,' ',Apellidos) = ? OR CONCAT(Nombres,' ',Apellidos) LIKE ? LIMIT 1`;
      return db.query(q, [s, s, s, likeName], (err, results) => {
        if (err) return cb(err);
        if (results && results.length > 0) return cb(null, results[0].Colegiado);
        return cb(new Error('No se encontró el doctor con el identificador proporcionado.'));
      });
    }

    const dataType = (typeRows && typeRows[0] && typeRows[0].DATA_TYPE) ? typeRows[0].DATA_TYPE.toLowerCase() : null;

  // Helper para intentar coincidencias tolerantes (variantes de búsqueda)
    const tryTolerantMatch = (selectExpr, doneCb) => {
      const cleaned = s.replace(/[^a-zA-Z0-9 ]/g, '').trim();
      const cleanedNoSpace = cleaned.replace(/\s+/g, '');
      const upper = s.toUpperCase();
      const like1 = `%${s}%`;
      const like2 = `%${cleaned}%`;
      const like3 = `%${cleanedNoSpace}%`;
      const digitsMatch = (cleanedNoSpace.match(/(\d+)/) || [])[0] || null;

      // Build a tolerant WHERE that tries multiple columns and patterns
      const whereClauses = [];
      const params = [];

      // exacts
      whereClauses.push(`Colegiado = ?`); params.push(s);
      whereClauses.push(`Colegiado = ?`); params.push(cleaned);
      whereClauses.push(`UPPER(Colegiado) = ?`); params.push(upper);
      whereClauses.push(`Correo = ?`); params.push(s);
      // name equals
      whereClauses.push(`CONCAT(Nombres,' ',Apellidos) = ?`); params.push(s);
      // LIKE patterns
      whereClauses.push(`Colegiado LIKE ?`); params.push(like1);
      whereClauses.push(`Colegiado LIKE ?`); params.push(like2);
      whereClauses.push(`Colegiado LIKE ?`); params.push(like3);
      whereClauses.push(`CONCAT(Nombres,' ',Apellidos) LIKE ?`); params.push(like1);
      whereClauses.push(`CONCAT(Nombres,' ',Apellidos) LIKE ?`); params.push(like2);

      const whereSql = whereClauses.join(' OR ');
      const q = `SELECT ${selectExpr} AS resolved FROM doctores WHERE (${whereSql}) LIMIT 1`;
      db.query(q, params, (e, r) => {
        if (e) return doneCb(e);
        if (r && r.length > 0) return doneCb(null, r[0].resolved);
        // If digits present, try PK = digits as a last resort
        if (digitsMatch) {
          const tryPkSql = `SELECT ${selectExpr} AS resolved FROM doctores WHERE ${selectExpr} = ? LIMIT 1`;
          return db.query(tryPkSql, [digitsMatch], (ee, rr) => {
            if (ee) return doneCb(ee);
            if (rr && rr.length > 0) return doneCb(null, rr[0].resolved);
            return doneCb(null, null);
          });
        }
        return doneCb(null, null);
      });
    };

    // If the citas column is numeric, resolve to the doctors PK; otherwise return Colegiado
    if (dataType === 'int' || dataType === 'bigint' || dataType === 'mediumint' || dataType === 'smallint' || dataType === 'tinyint') {
      // Get primary key column name from doctores
      const pkSql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'doctores' AND COLUMN_KEY = 'PRI' LIMIT 1`;
      db.query(pkSql, [schema], (errPk, pkRows) => {
        if (errPk) {
          console.error('[RESOLVE PROFESSIONAL] error reading doctors PK:', errPk);
          return cb(errPk);
        }
        const pk = (pkRows && pkRows[0] && pkRows[0].COLUMN_NAME) ? pkRows[0].COLUMN_NAME : null;
        if (!pk) return cb(new Error('No se pudo determinar la PK de la tabla doctores.'));
        // Try tolerant matches returning the PK column
        tryTolerantMatch(pk, (errTry, resolved) => {
          if (errTry) return cb(errTry);
          if (resolved) return cb(null, resolved);
          return cb(new Error('No se encontró el doctor con el identificador proporcionado. Use el ID numérico, colegiado o correo.'));
        });
      });
    } else {
      // Non-numeric target column: return Colegiado (string) as before
      tryTolerantMatch('Colegiado', (errTry, resolved) => {
        if (errTry) return cb(errTry);
        if (resolved) return cb(null, resolved);
        return cb(new Error('No se encontró el doctor con el identificador proporcionado. Use el ID numérico, colegiado o correo.'));
      });
    }
  });
}

// Error handler for invalid JSON (body parser SyntaxError). Must be registered
// after express.json() so that JSON parse errors are forwarded here. Returning
// a JSON response avoids the HTML error page and ensures CORS headers are
// present (CORS middleware runs earlier).
app.use((err, req, res, next) => {
  if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    console.warn('[JSON PARSE ERROR]', err.message);
    return res.status(400).json({ success: false, message: 'JSON parse error', error: err.message });
  }
  return next(err);
});

// Obtener todos los pacientes
app.get('/api/pacientes', (req, res) => {
  db.query("SELECT * FROM pacientes WHERE Activo = 'SI'", (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener pacientes', error: err });
    }
    res.json({ success: true, data: results });
  });
});

// Obtener todas las secretarias
app.get('/api/secretarias', (req, res) => {
  db.query("SELECT * FROM secretarias WHERE Activo = 'SI'", (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener secretarias', error: err });
    }
    res.json({ success: true, data: results });
  });
});

// (Handler duplicado de creación de citas eliminado - usar el handler canónico más abajo que resuelve el identificador del doctor)

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email y password son requeridos' });
    }

    db.query('SELECT * FROM Usuarios WHERE correo = ?', [email], (err, results) => {
      try {
        if (err) {
          console.error('[LOGIN] DB error:', err);
          return res.status(500).json({ success: false, message: 'Error de servidor', error: err });
        }
        if (!results || results.length === 0) {
          return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
        }
        const user = results[0];

        // Verificar contraseña con bcrypt
        bcrypt.compare(password, user.contrasenia, (errB, isMatch) => {
          try {
            if (errB) {
              console.error('[LOGIN] bcrypt error:', errB);
              return res.status(500).json({ success: false, message: 'Error de servidor', error: errB });
            }
            if (!isMatch) {
              return res.status(401).json({ success: false, message: 'Credenciales incorrectas' });
            }

            // Obtener datos completos según tipo
            let query = '';
            let idValue = null;
            if (user.Tipo === 'Paciente') {
              query = 'SELECT * FROM pacientes WHERE Correo = ?';
              idValue = user.correo;
            } else if (user.Tipo === 'Doctor') {
              query = 'SELECT * FROM doctores WHERE Correo = ?';
              idValue = user.correo;
            } else if (user.Tipo === 'Secretaria') {
              query = 'SELECT * FROM secretarias WHERE Correo = ?';
              idValue = user.correo;
            } else if (user.Tipo === 'Administrador') {
              query = 'SELECT * FROM administradores WHERE Correo = ?';
              idValue = user.correo;
            }

            const sendBasicUser = () => {
              const mappedUser = {
                id: user.idUsuarios,
                nombres: user.Nombres || user.nombres,
                apellidos: user.Apellidos || user.apellidos,
                correo: user.correo,
                telefono: user.Telefono || user.telefono || '',
                activo: (user.Activo || 'SI') === 'SI',
                tipo: (user.Tipo || '').toLowerCase(),
              };
              const token = jwt.sign({ userId: user.idUsuarios, email: user.correo }, process.env.JWT_SECRET || 'secreto', { expiresIn: '24h' });
              return res.json({ success: true, message: 'Login exitoso', data: { user: mappedUser, tipo: mappedUser.tipo, token } });
            };

            if (!query) {
              // No detalle extra declared on Usuarios.Tipo: try to discover the user's
              // detail row by searching the common detail tables (pacientes, doctores,
              // secretarias, administradores). This helps when Usuarios.Tipo is empty
              // but the information exists in the entity tables.
              const detailChecks = [
                { type: 'Paciente', table: 'pacientes' },
                { type: 'Doctor', table: 'doctores' },
                { type: 'Secretaria', table: 'secretarias' },
                { type: 'Administrador', table: 'administradores' }
              ];

              let idx = 0;
              const tryNextDetail = () => {
                if (idx >= detailChecks.length) {
                  // Nothing found; fall back to basic user
                  return sendBasicUser();
                }
                const chk = detailChecks[idx++];
                const sql = `SELECT * FROM ${chk.table} WHERE Correo = ? LIMIT 1`;
                db.query(sql, [idValue], (errChk, rowsChk) => {
                  try {
                    if (!errChk && rowsChk && rowsChk.length > 0) {
                      const fullData = rowsChk[0];
                      const mappedUser = {
                        id: user.idUsuarios,
                        nombres: fullData.Nombres || fullData.nombres || user.Nombres || user.nombres || '',
                        apellidos: fullData.Apellidos || fullData.apellidos || user.Apellidos || user.apellidos || '',
                        correo: user.correo,
                        telefono: fullData.Telefono || fullData.telefono || user.Telefono || user.telefono || '',
                        activo: (fullData.Activo || fullData.activo || user.Activo || 'SI') === 'SI',
                        tipo: (chk.type || '').toString().toLowerCase()
                      };
                      const token = jwt.sign({ userId: user.idUsuarios, email: user.correo }, process.env.JWT_SECRET || 'secreto', { expiresIn: '24h' });
                      return res.json({ success: true, message: 'Login exitoso', data: { user: mappedUser, tipo: mappedUser.tipo, token } });
                    }
                  } catch (exTry) {
                    console.error('[LOGIN] error probing detail table', chk.table, exTry);
                    // continue to next
                  }
                  // not found or error -> try next
                  tryNextDetail();
                });
              };

              // start probing
              tryNextDetail();
              return;
            }

            db.query(query, [idValue], (err2, results2) => {
              try {
                if (err2) {
                  console.error('[LOGIN] DB error fetching full data:', err2);
                  // If the table simply doesn't exist (seeded minimal DB), fallback
                  // to returning the basic user instead of failing with 500.
                  if (err2 && (err2.code === 'ER_NO_SUCH_TABLE' || err2.errno === 1146)) {
                    console.warn('[LOGIN] Detail table missing, returning basic user instead of 500');
                    return sendBasicUser();
                  }
                  return res.status(500).json({ success: false, message: 'No se pudo obtener datos completos', error: err2 });
                }
                if (!results2 || results2.length === 0) {
                  // Return basic user if no detail record found (avoid 500)
                  console.warn('[LOGIN] No detail record found for user, returning basic data');
                  return sendBasicUser();
                }
                const fullData = results2[0];
                const mappedUser = {
                  id: user.idUsuarios,
                  nombres: fullData.Nombres || fullData.nombres,
                  apellidos: fullData.Apellidos || fullData.apellidos,
                  correo: user.correo,
                  telefono: fullData.Telefono || fullData.telefono || '',
                  activo: (fullData.Activo || fullData.activo || 'SI') === 'SI',
                  tipo: (user.Tipo || '').toLowerCase(),
                  dpi: fullData.DPI || fullData.dpi,
                  colegiado: fullData.Colegiado || fullData.colegiado,
                  idAdministrador: fullData.idAdministrador,
                  idSecretaria: fullData.idSecretaria
                };
                const token = jwt.sign({ userId: user.idUsuarios, email: user.correo }, process.env.JWT_SECRET || 'secreto', { expiresIn: '24h' });
                return res.json({ success: true, message: 'Login exitoso', data: { user: mappedUser, tipo: mappedUser.tipo, token } });
              } catch (exInner) {
                console.error('[LOGIN] unexpected inner error:', exInner);
                return res.status(500).json({ success: false, message: 'Error interno', error: exInner && exInner.message });
              }
            });
          } catch (exB) {
            console.error('[LOGIN] unexpected error in bcrypt callback:', exB);
            return res.status(500).json({ success: false, message: 'Error interno', error: exB && exB.message });
          }
        });
      } catch (exCb) {
        console.error('[LOGIN] unexpected error in DB callback:', exCb);
        return res.status(500).json({ success: false, message: 'Error interno', error: exCb && exCb.message });
      }
    });
  } catch (ex) {
    console.error('[LOGIN] unexpected error:', ex);
    return res.status(500).json({ success: false, message: 'Error interno', error: ex && ex.message });
  }
});

  // Restablecer contraseña sin restricciones (buscar usuario por correo y establecer nueva contraseña)
app.post('/api/auth/reset-password', (req, res) => {
  const { correo, nuevaContrasenia } = req.body || {};
  if (!correo || !nuevaContrasenia) {
    return res.status(400).json({ success: false, message: 'correo y nuevaContrasenia son requeridos' });
  }
  // Hash the new password
  bcrypt.hash(nuevaContrasenia, 10, (errHash, hashed) => {
    if (errHash) return res.status(500).json({ success: false, message: 'Error al procesar la contraseña' });
    const sql = `UPDATE Usuarios SET contrasenia = ? WHERE correo = ?`;
    db.query(sql, [hashed, correo], (err, result) => {
      if (err) {
        console.error('[RESET PASSWORD] db error', err);
        return res.status(500).json({ success: false, message: 'Error de servidor al actualizar contraseña', error: err });
      }
      if (result && result.affectedRows && result.affectedRows > 0) {
        // Insert audit log
        insertAudit(req, 'reset_password', 'Usuarios', correo, null, 'contraseña actualizada', (ae) => {
          if (ae) console.warn('[RESET PASSWORD] audit insert error', ae);
          return res.json({ success: true, message: 'Contraseña actualizada correctamente' });
        });
      } else {
        return res.status(404).json({ success: false, message: 'No se encontró un usuario con ese correo' });
      }
    });
  });
});

// Obtener todos los usuarios
// Obtener detalles de un paciente por DPI
app.get('/api/pacientes/:dpi', (req, res) => {
  const dpi = req.params.dpi;
  db.query('SELECT * FROM pacientes WHERE DPI = ?', [dpi], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error de servidor', error: err });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Paciente no encontrado' });
    res.json(results[0]);
  });
});

// Obtener detalles de un doctor por colegiado
app.get('/api/doctores/:colegiado', (req, res) => {
  const colegiado = req.params.colegiado;
  db.query('SELECT * FROM doctores WHERE Colegiado = ?', [colegiado], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error de servidor', error: err });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Doctor no encontrado' });
    res.json(results[0]);
  });

});

// Endpoint paginado y filtrado para citas
  // Soporta: ?date=YYYY-MM-DD  -> citas en esa fecha
  //          ?from=YYYY-MM-DD&to=YYYY-MM-DD -> rango inclusivo
  //          ?status=pending|confirmed|cancelled -> filtrar por estado
  //          ?page=1&limit=50 -> paginación
  app.get('/api/citas', (req, res) => {
    try {
      // Traza de depuración: registrar parámetros de consulta entrantes
      try { console.log('[CITAS] incoming query:', req.query); } catch(e) { console.warn('[CITAS] failed to log query', e); }
      const { date, from, to, status } = req.query;
      const page = Math.max(1, parseInt(req.query.page || '1'));
      const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit || '50')));
      const offset = (page - 1) * limit;

      const whereClauses = [];
      const params = [];

      if (date) {
        whereClauses.push('Fecha = ?');
        params.push(date);
      }
      if (from && to) {
        whereClauses.push('Fecha BETWEEN ? AND ?');
        params.push(from, to);
      }
      if (status) {
        const s = String(status).toLowerCase();
        if (s === 'pending' || s === 'pendiente') {
          whereClauses.push("(Confirmado = 'Pendiente' OR Confirmado = 'NO' OR Confirmado = 'N' OR Confirmado = '')");
        } else if (s === 'confirmed' || s === 'confirmada' || s === 'si') {
          whereClauses.push("(Confirmado = 'Confirmada' OR Confirmado = 'SI' OR Confirmado = 'S')");
        } else if (s === 'cancelled' || s === 'cancelada' || s === 'cancel') {
          whereClauses.push("(Confirmado = 'Cancelada' OR Confirmado = 'CANCELADA' OR Confirmado = 'CANCEL')");
        }
      }

      const whereSql = whereClauses.length > 0 ? ('WHERE ' + whereClauses.join(' AND ')) : '';
  try { console.log('[CITAS] whereSql:', whereSql, 'params:', params, 'page:', page, 'limit:', limit); } catch(e) { /* ignore */ }

      const countSql = `SELECT COUNT(*) as total FROM citas ${whereSql}`;
      db.query(countSql, params, (errCount, countRows) => {
        if (errCount) {
          console.error('[CITAS] countSql error', { err: errCount, sql: countSql, params });
          return res.status(500).json({ success: false, message: 'Error counting citas', error: { short: errCount.sqlMessage || errCount.message || String(errCount), code: errCount.code } });
        }
        const total = (countRows && countRows[0] && countRows[0].total) ? countRows[0].total : 0;

  // NOTA: usar únicamente d.Colegiado para el JOIN y evitar nombres de PK distintos entre esquemas
  const dataSql = `SELECT c.*, p.Nombres AS pacienteNombres, p.Apellidos AS pacienteApellidos, d.Nombres AS doctorNombres, d.Apellidos AS doctorApellidos, e.Nombre AS especialidadNombre FROM citas c LEFT JOIN pacientes p ON p.DPI = c.Paciente LEFT JOIN doctores d ON d.Colegiado = c.Profesional_Responsable LEFT JOIN especialidades e ON e.idEspecialidades = c.Consulta_Especialidad ${whereSql} ORDER BY c.Fecha ASC, c.Hora ASC LIMIT ? OFFSET ?`;

        // append pagination params
        const dataParams = params.slice();
        dataParams.push(limit, offset);

        db.query(dataSql, dataParams, (errData, dataRows) => {
          if (errData) {
            console.error('[CITAS] dataSql error', { err: errData, sql: dataSql, params: dataParams });
            return res.status(500).json({ success: false, message: 'Error fetching citas', error: { short: errData.sqlMessage || errData.message || String(errData), code: errData.code } });
          }
          // Map rows to include nested info objects
          try { console.log('[CITAS] returned rows:', (dataRows || []).length); } catch(e) {}
          let mapped = (dataRows || []).map(r => ({
            ...r,
            // provide lowercase aliases expected by frontend templates
            Fecha: r.Fecha,
            fecha: r.Fecha,
            Hora: r.Hora,
            hora: r.Hora,
            Paciente: r.Paciente,
            paciente: r.Paciente,
            Consulta_Especialidad: r.Consulta_Especialidad,
            consulta_Especialidad: r.Consulta_Especialidad,
            Profesional_Responsable: r.Profesional_Responsable,
            profesional_Responsable: r.Profesional_Responsable,
            pacienteInfo: { nombres: r.pacienteNombres, apellidos: r.pacienteApellidos },
            doctorInfo: { nombres: r.doctorNombres, apellidos: r.doctorApellidos },
            especialidadInfo: { Nombre: r.especialidadnombre }
          }));

          // If some rows are missing Fecha/Hora, fetch them directly from the citas table by id
          try {
            const missing = mapped.filter(m => !m.Fecha && !m.hora && (m.idCitas || m.idcitas || m.id)).map(m => m.idCitas || m.idcitas || m.id);
            if (missing.length > 0) {
              const placeholders = missing.map(() => '?').join(',');
              const dateQ = `SELECT idCitas, Fecha, Hora FROM citas WHERE idCitas IN (${placeholders})`;
              db.query(dateQ, missing, (errDates, dateRows) => {
                if (!errDates && Array.isArray(dateRows)) {
                  const dateMap = {};
                  dateRows.forEach(d => { dateMap[d.idCitas] = d; });
                  mapped = mapped.map(m => {
                    const id = m.idCitas || m.idcitas || m.id;
                    if (id && dateMap[id]) {
                      m.Fecha = m.Fecha || dateMap[id].Fecha;
                      m.fecha = m.fecha || dateMap[id].Fecha;
                      m.Hora = m.Hora || dateMap[id].Hora;
                      m.hora = m.hora || dateMap[id].Hora;
                    }
                    return m;
                  });
                }
                return res.json({ success: true, data: mapped, meta: { total, page, limit } });
              });
              return; // response sent in callback
            }
          } catch (ex) { console.warn('[CITAS] could not fetch missing dates:', ex); }

          res.json({ success: true, data: mapped, meta: { total, page, limit } });
        });
      });
    } catch (ex) {
      console.error('Error in /api/citas handler', ex);
      res.status(500).json({ success: false, message: 'Server error', error: ex });
    }
  });

// (removed duplicate resolveProfessional appointment handler)
app.get('/api/secretarias/:idSecretarias', (req, res) => {
  const idSecretarias = req.params.idSecretarias;
  db.query('SELECT * FROM secretarias WHERE idSecretarias = ?', [idSecretarias], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error de servidor', error: err });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Secretaria no encontrada' });
    res.json(results[0]);
  });
});

// Obtener detalles de un administrador por idAdministradores
// Protected: only admins can fetch other admins
app.get('/api/administradores/:idAdministradores', authenticateToken, authorizeRole('administrador'), (req, res) => {
  const idAdministradores = req.params.idAdministradores;
  db.query('SELECT * FROM administradores WHERE idAdministradores = ?', [idAdministradores], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error de servidor', error: err });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
    res.json(results[0]);
  });
});
// Crear usuario (admin o registro)
app.post('/api/users', (req, res) => {
  const { nombres, apellidos, correo, password, tipo, activo, dpi, colegiado, idAdministrador, idSecretaria, telefono, especialidad, especialidades } = req.body;
  console.log('Datos recibidos para crear usuario:', req.body);
  // Validar campos obligatorios
  if (!correo || !password || !tipo) {
    return res.status(400).json({ success: false, message: 'Faltan correo, contraseña o tipo de usuario' });
  }
  // Verificar que el correo no exista ya en Usuarios o en las tablas de entidad (previene duplicados)
  const emailToCheck = correo;
  const emailChecks = [
    { sql: 'SELECT COUNT(*) AS c FROM Usuarios WHERE correo = ?', params: [emailToCheck] },
    { sql: 'SELECT COUNT(*) AS c FROM pacientes WHERE Correo = ?', params: [emailToCheck] },
    { sql: 'SELECT COUNT(*) AS c FROM doctores WHERE Correo = ?', params: [emailToCheck] },
    { sql: 'SELECT COUNT(*) AS c FROM secretarias WHERE Correo = ?', params: [emailToCheck] },
    { sql: 'SELECT COUNT(*) AS c FROM administradores WHERE Correo = ?', params: [emailToCheck] }
  ];
  // Execute checks in series
  let anyExists = false;
  const runCheck = (idx) => {
    if (idx >= emailChecks.length) {
      if (anyExists) return res.status(400).json({ success: false, message: 'El correo ya está en uso. Por favor use otro correo.' });
      // continue with creation
      proceedCreate();
      return;
    }
    const q = emailChecks[idx];
    db.query(q.sql, q.params, (errChk, rowsChk) => {
      if (errChk) {
        console.error('[EMAIL CHECK] error:', errChk);
        return res.status(500).json({ success: false, message: 'Error verificando correo', error: errChk });
      }
      const cnt = (rowsChk && rowsChk[0] && (rowsChk[0].c || rowsChk[0].C || rowsChk[0]['COUNT(*)'])) ? (rowsChk[0].c || rowsChk[0].C || rowsChk[0]['COUNT(*)']) : 0;
      if (parseInt(cnt) > 0) anyExists = true;
      runCheck(idx + 1);
    });
  };

  const proceedCreate = () => {
    // Hash de la contraseña
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        console.error('Error al encriptar contraseña:', err);
        return res.status(500).json({ success: false, message: 'Error al encriptar contraseña', error: err });
      }
      // Insertar en Usuarios
      const queryUsuarios = `INSERT INTO Usuarios (correo, contrasenia, Tipo) VALUES (?, ?, ?)`;
      const valuesUsuarios = [correo, hash, tipo.toLowerCase()];
      console.log('Query Usuarios:', queryUsuarios);
      console.log('Values Usuarios:', valuesUsuarios);
      db.query(queryUsuarios, valuesUsuarios, (err, result) => {
        if (err) {
          console.error('Error al crear usuario en Usuarios:', err);
          return res.status(500).json({ success: false, message: 'Error al crear usuario', error: err });
        }
        const idUsuario = result.insertId;
        // Continue existing creation logic for pacientes/doctores/secretarias/administradores
        createSpecificEntity(idUsuario);
      });
    });
  };

  const createSpecificEntity = (idUsuario) => {
    if (tipo.toLowerCase() === 'paciente') {
      const queryPacientes = `INSERT INTO Pacientes (DPI, Nombres, Apellidos, Telefono, Correo, Activo) VALUES (?, ?, ?, ?, ?, ?)`;
      const valuesPacientes = [dpi, nombres, apellidos, telefono || '', correo, activo ? 'SI' : 'NO'];
      db.query(queryPacientes, valuesPacientes, (err2) => {
        if (err2) {
          console.error('Error al crear paciente en Pacientes:', err2);
          return res.status(500).json({ success: false, message: 'Error al crear paciente', error: err2 });
        }
        db.query('SELECT * FROM pacientes WHERE DPI = ?', [dpi], (errSel, rowsSel) => {
          const created = (rowsSel && rowsSel.length > 0) ? rowsSel[0] : { tipo: 'paciente', correo };
          insertAudit(req, 'user_create', 'user', idUsuario, null, JSON.stringify(created), (errAudit, auditId) => {
            if (errAudit) console.warn('Audit insert failed for user_create', errAudit);
            return res.json({ success: true, message: 'Paciente creado exitosamente', userId: idUsuario, tipo: 'paciente' });
          });
        });
      });
    } else if (tipo.toLowerCase() === 'doctor') {
      if (!colegiado) {
        return res.status(400).json({ success: false, message: 'Colegiado es obligatorio para doctores' });
      }
      const queryDoctor = `INSERT INTO doctores (Colegiado, Nombres, Apellidos, Telefono, Correo, Activo, Especialidad) VALUES (?, ?, ?, ?, ?, ?, ?)`;
      const valuesDoctor = [colegiado, nombres, apellidos, telefono || '', correo, activo ? 'SI' : 'NO', especialidad || ''];
      db.query(queryDoctor, valuesDoctor, (err2, resultDoctor) => {
        if (err2) {
          return res.status(500).json({ success: false, message: 'Error al crear doctor', error: err2 });
        }
        const idDoctor = resultDoctor.insertId;
        if (Array.isArray(especialidades) && especialidades.length > 0) {
          const valuesRel = especialidades.map(idEsp => [colegiado, idEsp]);
          const placeholders = valuesRel.map(() => '(?, ?)').join(', ');
          const flatValues = valuesRel.flat();
          const queryRel = `INSERT INTO especialidades_has_doctores (Doctores_Colegiado, Especialidades_idEspecialidades) VALUES ${placeholders}`;
          db.query(queryRel, flatValues, (errRel) => {
            if (errRel) {
              console.error('Error en especialidades_has_doctores:', errRel);
              return res.status(500).json({ success: false, message: 'Doctor creado pero error en especialidades_has_doctores', error: errRel });
            }
            db.query('SELECT * FROM doctores WHERE Colegiado = ?', [colegiado], (errSel, rowsSel) => {
              const created = (rowsSel && rowsSel.length > 0) ? rowsSel[0] : { tipo: 'doctor', correo };
              insertAudit(req, 'user_create', 'user', idUsuario, null, JSON.stringify(created), (errAudit) => {
                if (errAudit) console.warn('Audit insert failed for user_create', errAudit);
                return res.json({ success: true, message: 'Doctor creado exitosamente', userId: idUsuario, tipo: 'doctor' });
              });
            });
          });
        } else {
          return res.json({ success: true, message: 'Doctor creado exitosamente', userId: idUsuario, tipo: 'doctor' });
        }
      });
    } else if (tipo.toLowerCase() === 'secretaria') {
      const querySecretaria = `INSERT INTO secretarias (Nombres, Apellidos, Telefono, Correo, Activo) VALUES (?, ?, ?, ?, ?)`;
      const valuesSecretaria = [nombres, apellidos, telefono || '', correo, activo ? 'SI' : 'NO'];
      db.query(querySecretaria, valuesSecretaria, (err2) => {
        if (err2) {
          return res.status(500).json({ success: false, message: 'Error al crear secretaria', error: err2 });
        }
        db.query('SELECT * FROM secretarias WHERE Correo = ?', [correo], (errSel, rowsSel) => {
          const created = (rowsSel && rowsSel.length > 0) ? rowsSel[0] : { tipo: 'secretaria', correo };
          insertAudit(req, 'user_create', 'user', idUsuario, null, JSON.stringify(created), (errAudit) => {
            if (errAudit) console.warn('Audit insert failed for user_create', errAudit);
            return res.json({ success: true, message: 'Secretaria creada exitosamente', userId: idUsuario, tipo: 'secretaria' });
          });
        });
      });
    } else if (tipo.toLowerCase() === 'administrador') {
      const queryAdmin = `INSERT INTO administradores (Nombres, Apellidos, Correo, Activo) VALUES (?, ?, ?, ?)`;
      const valuesAdmin = [nombres, apellidos, correo, activo ? 'SI' : 'NO'];
      db.query(queryAdmin, valuesAdmin, (err2) => {
        if (err2) {
          return res.status(500).json({ success: false, message: 'Error al crear administrador', error: err2 });
        }
        db.query('SELECT * FROM administradores WHERE Correo = ?', [correo], (errSel, rowsSel) => {
          const created = (rowsSel && rowsSel.length > 0) ? rowsSel[0] : { tipo: 'administrador', correo };
          insertAudit(req, 'user_create', 'user', idUsuario, null, JSON.stringify(created), (errAudit) => {
            if (errAudit) console.warn('Audit insert failed for user_create', errAudit);
            return res.json({ success: true, message: 'Administrador creado exitosamente', userId: idUsuario, tipo: 'administrador' });
          });
        });
      });
    } else {
      return res.json({ success: true, message: 'Usuario creado exitosamente', userId: idUsuario });
    }
  };

  // Start the chain of email checks
  runCheck(0);
  if (tipo.toLowerCase() === 'administrador') {
    const auth = req.headers && req.headers.authorization ? req.headers.authorization : null;
    if (!auth || !auth.toString().toLowerCase().startsWith('bearer ')) {
      return res.status(403).json({ success: false, message: 'Creación de administradores requiere autenticación de administrador' });
    }
    try {
      const token = auth.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
      const userRole = ((decoded.tipo || decoded.role || '') || '').toString().toLowerCase();
      if (userRole !== 'administrador') return res.status(403).json({ success: false, message: 'No autorizado para crear administradores' });
    } catch (exAuth) {
      return res.status(403).json({ success: false, message: 'No autorizado para crear administradores', error: exAuth && exAuth.message ? exAuth.message : exAuth });
    }
  }
  // Validar campos para paciente
  if (tipo.toLowerCase() === 'paciente') {
    if (!nombres || !apellidos || !dpi) {
      return res.status(400).json({ success: false, message: 'Faltan nombres, apellidos o DPI para paciente' });
    }
  }
});
// Crear especialidad
app.post('/api/specialties', (req, res) => {
  const { nombre, descripcion } = req.body;
  if (!nombre) {
    return res.status(400).json({ success: false, message: 'El nombre de la especialidad es obligatorio' });
  }
  const query = 'INSERT INTO especialidades (Nombre, Descripcion) VALUES (?, ?)';
  db.query(query, [nombre, descripcion || ''], (err, result) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al crear especialidad', error: err });
    }
    // éxito
    return res.json({ success: true, message: 'Especialidad creada exitosamente', idEspecialidad: result.insertId });
  });
});

// Obtener todas las especialidades
app.get('/api/specialties', (req, res) => {
  db.query('SELECT idEspecialidades AS idEspecialidad, Nombre AS nombre, Descripcion AS descripcion FROM especialidades', (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error al obtener especialidades', error: err });
    // Devolver en formato { specialties: [...] } para compatibilidad con frontend
    return res.json({ success: true, specialties: results });
  });
});

// Endpoint de health para comprobaciones rápidas
// Expose both /health and /api/health because some platforms (Render)
// probe /health by default. Returning a lightweight JSON ensures the
// deploy healthchecks succeed when the server process is reachable.
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// --- Metrics endpoints ---
// Citas por día de la semana actual (Lun..Dom)
app.get('/api/metrics/appointments/week', (req, res) => {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diffToMonday);
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const start = monday.toISOString().split('T')[0];
  const end = sunday.toISOString().split('T')[0];

  const query = `SELECT Fecha AS date, COUNT(*) AS count FROM citas WHERE Fecha BETWEEN ? AND ? GROUP BY Fecha ORDER BY Fecha`;
  db.query(query, [start, end], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error al obtener métricas de citas', error: err });
    // Build full week array with zero defaults
    const labels = [];
    const data = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayStr = d.toISOString().split('T')[0];
      labels.push(dayStr);
      const row = results.find((r) => r.date === dayStr);
      data.push(row ? row.count : 0);
    }
    res.json({ success: true, labels, data });
  });
});

// Usuarios nuevos por día en el mes actual
app.get('/api/metrics/users/new/month', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-based
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end = `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}`;
  // We'll try several likely date columns (in pacientes and Usuarios) and gracefully
  // fallback: devolver arreglos rellenados con ceros si no existen resultados para evitar errores SQL.
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const zeroData = new Array(daysInMonth).fill(0);

  const queries = [
    { sql: `SELECT DATE(FechaCreacion) AS date, COUNT(*) AS count FROM pacientes WHERE FechaCreacion BETWEEN ? AND ? GROUP BY DATE(FechaCreacion) ORDER BY DATE(FechaCreacion)`, params: [start, end] },
    { sql: `SELECT DATE(FechaAlta) AS date, COUNT(*) AS count FROM pacientes WHERE FechaAlta BETWEEN ? AND ? GROUP BY DATE(FechaAlta) ORDER BY DATE(FechaAlta)`, params: [start, end] },
    { sql: `SELECT DATE(created_at) AS date, COUNT(*) AS count FROM Usuarios WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY DATE(created_at) ORDER BY DATE(created_at)`, params: [start, end] },
    { sql: `SELECT DATE(FechaCreacion) AS date, COUNT(*) AS count FROM Usuarios WHERE DATE(FechaCreacion) BETWEEN ? AND ? GROUP BY DATE(FechaCreacion) ORDER BY DATE(FechaCreacion)`, params: [start, end] }
  ];

  const tryQuery = (i) => {
    if (i >= queries.length) {
      // No valid query found; return zeros
      return res.json({ success: true, labels, data: zeroData });
    }
    const q = queries[i];
    db.query(q.sql, q.params, (err, results) => {
      if (err) {
        if (err.code === 'ER_BAD_FIELD_ERROR') {
          // try next possible query
          return tryQuery(i + 1);
        }
        console.error('Unexpected SQL error while obtaining new users metrics:', err);
        return res.status(500).json({ success: false, message: 'Error al obtener métricas de nuevos usuarios', error: err });
      }
      // Build daily arrays
      const data = new Array(daysInMonth).fill(0);
      if (Array.isArray(results)) {
        results.forEach((r) => {
          if (r.date) {
            const d = new Date(r.date);
            if (!isNaN(d)) {
              const idx = d.getDate() - 1;
              if (idx >= 0 && idx < daysInMonth) data[idx] = r.count;
            }
          }
        });
      }
      return res.json({ success: true, labels, data });
    });
  };

  tryQuery(0);
});

// Usuarios dados de baja por día en el mes actual (se asume campo FechaBaja en pacientes o Usuarios)
app.get('/api/metrics/users/deactivated/month', (req, res) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const start = `${year}-${String(month).padStart(2,'0')}-01`;
  const end = `${year}-${String(month).padStart(2,'0')}-${new Date(year, month, 0).getDate()}`;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
  const zeroData = new Array(daysInMonth).fill(0);

  const queries = [
    { sql: `SELECT DATE(FechaBaja) AS date, COUNT(*) AS count FROM pacientes WHERE FechaBaja BETWEEN ? AND ? GROUP BY DATE(FechaBaja) ORDER BY DATE(FechaBaja)`, params: [start, end] },
    { sql: `SELECT DATE(FechaBaja) AS date, COUNT(*) AS count FROM Usuarios WHERE DATE(FechaBaja) BETWEEN ? AND ? GROUP BY DATE(FechaBaja) ORDER BY DATE(FechaBaja)`, params: [start, end] },
    { sql: `SELECT DATE(deactivated_at) AS date, COUNT(*) AS count FROM Usuarios WHERE DATE(deactivated_at) BETWEEN ? AND ? GROUP BY DATE(deactivated_at) ORDER BY DATE(deactivated_at)`, params: [start, end] }
  ];

  const tryQuery = (i) => {
    if (i >= queries.length) {
      return res.json({ success: true, labels, data: zeroData });
    }
    const q = queries[i];
    db.query(q.sql, q.params, (err, results) => {
      if (err) {
        if (err.code === 'ER_BAD_FIELD_ERROR') return tryQuery(i + 1);
        console.error('Unexpected SQL error while obtaining deactivated users metrics:', err);
        return res.status(500).json({ success: false, message: 'Error al obtener métricas de usuarios dados de baja', error: err });
      }
      const data = new Array(daysInMonth).fill(0);
      if (Array.isArray(results)) {
        results.forEach((r) => {
          if (r.date) {
            const d = new Date(r.date);
            if (!isNaN(d)) {
              const idx = d.getDate() - 1;
              if (idx >= 0 && idx < daysInMonth) data[idx] = r.count;
            }
          }
        });
      }
      return res.json({ success: true, labels, data });
    });
  };

  tryQuery(0);
});

app.get('/api/users', (req, res) => {
  // Devuelve todos los usuarios (tanto activos como inactivos).
  // Intentar leer Estado; si la columna no existe (error de campo), caer a Activo como Estado.
  const tryQueries = [
    // Primer intento: usar columna Estado si existe
    { sql: "SELECT idUsuarios AS id, correo, Tipo, Nombres, Apellidos, Estado FROM usuarios" },
    // Segundo intento: mapear Activo como Estado (muchos esquemas usan Activo en Usuarios)
    { sql: "SELECT idUsuarios AS id, correo, Tipo, Nombres, Apellidos, Activo AS Estado FROM usuarios" }
  ];

  const run = (i = 0) => {
    if (i >= tryQueries.length) {
      return res.status(500).json({ success: false, message: 'Error de servidor al leer usuarios (Estado/Activo no disponible)' });
    }
    db.query(tryQueries[i].sql, async (err, usuarios) => {
      if (err) {
        // MySQL undefined column -> ER_BAD_FIELD_ERROR, Postgres -> 42703
        const code = (err && (err.code || err.sqlState)) || '';
        if (code === 'ER_BAD_FIELD_ERROR' || code === '42703') {
          return run(i + 1);
        }
        return res.status(500).json({ success: false, message: 'Error de servidor', error: err });
      }
    // Obtener datos completos según tipo
    const usuariosCompletos = await Promise.all(usuarios.map(user => {
      return new Promise((resolve) => {
        let query = '';
        let idField = '';
        let idValue = '';
        if (user.Tipo === 'Paciente') {
          // No filtramos por Activo aquí; devolvemos los registros incluso si Activo = 'NO'
          query = "SELECT DPI AS dpi, Nombres AS nombres, Apellidos AS apellidos, Telefono AS telefono, Correo AS correo, Activo AS activo FROM pacientes WHERE Correo = ?";
          idValue = user.correo;
        } else if (user.Tipo === 'Doctor') {
          query = "SELECT Colegiado AS colegiado, Nombres AS nombres, Apellidos AS apellidos, Telefono AS telefono, Correo AS correo, Activo AS activo FROM doctores WHERE Correo = ?";
          idValue = user.correo;
        } else if (user.Tipo === 'Secretaria') {
          query = "SELECT idSecretarias AS idSecretaria, Nombres AS nombres, Apellidos AS apellidos, Telefono AS telefono, Correo AS correo, Activo AS activo FROM secretarias WHERE Correo = ?";
          idValue = user.correo;
        } else if (user.Tipo === 'Administrador') {
          query = "SELECT idAdministradores AS idAdministrador, Nombres AS nombres, Apellidos AS apellidos, Correo AS correo, Activo AS activo FROM administradores WHERE Correo = ?";
          idValue = user.correo;
        }
        if (query) {
          db.query(query, [idValue], (err2, results2) => {
            if (err2 || results2.length === 0) {
              // Si no hay datos extra, devolver solo datos básicos
              resolve(user);
            } else {
              resolve({ ...user, ...results2[0] });
            }
          });
        } else {
          resolve(user);
        }
      });
    }));
      res.json({
        success: true,
        message: 'Usuarios obtenidos exitosamente',
        data: usuariosCompletos
      });
    });
  };

  run(0);
});

// Obtener datos básicos de Usuarios por correo (para completar nombres/apellidos en frontend)
app.get('/api/usuarios/by-email/:correo', (req, res) => {
  const correo = req.params.correo;
  if (!correo) return res.status(400).json({ success: false, message: 'correo requerido' });
  db.query('SELECT Nombres, Apellidos FROM Usuarios WHERE correo = ? LIMIT 1', [correo], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Error de servidor', error: err });
    if (!rows || rows.length === 0) return res.json({ success: true, data: null });
    return res.json({ success: true, data: { nombres: rows[0].Nombres || '', apellidos: rows[0].Apellidos || '' } });
  });
});

// Ruta por defecto
app.get('/', (req, res) => {
  res.send('Backend de Dermatología funcionando');
});

// Obtener todas las especialidades
// (Duplicate appointment handlers removed - consolidated further below)

// Obtener citas por doctor y fecha
app.get('/api/citas/doctor/:Colegiado', (req, res) => {
  const doctorId = req.params.Colegiado;
  const { date } = req.query;
  let query = `
    SELECT c.*, 
      p.Nombres AS pacienteNombres, p.Apellidos AS pacienteApellidos, p.DPI AS pacienteDPI, p.Telefono AS pacienteTelefono,
      e.Nombre AS especialidadNombre,
      d.Nombres AS doctorNombres, d.Apellidos AS doctorApellidos
    FROM citas c
    LEFT JOIN pacientes p ON c.Paciente = p.DPI
    LEFT JOIN especialidades e ON c.Consulta_Especialidad = e.idEspecialidades
    LEFT JOIN doctores d ON c.Profesional_Responsable = d.Colegiado
    WHERE c.Profesional_Responsable = ?`;
  let params = [doctorId];
  if (date) {
    query += ' AND c.Fecha = ?';
    params.push(date);
  }
  db.query(query, params, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener citas del doctor', error: err });
    }
    res.json({ success: true, citas: results });
  });
});
// Verificar disponibilidad de doctor
app.get('/api/doctors/:colegiado/availability', (req, res) => {
  const colegiado = req.params.colegiado;
  const { date, time } = req.query;
  // Buscar si ya existe una cita para ese doctor, fecha y hora
  const query = `SELECT * FROM citas WHERE Profesional_Responsable = ? AND Fecha = ? AND Hora = ? AND (Confirmado IS NULL OR Confirmado <> 'Cancelada')`;
  db.query(query, [colegiado, date, time], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al verificar disponibilidad', error: err });
    }
    // Si no hay resultados, está disponible
    res.json({ available: results.length === 0 });
  });
});

// Crear nueva cita
app.post('/api/appointments', (req, res) => {
  const {
    patientDpi,
    patientNames,
    patientLastNames,
    patientPhone,
    patientEmail,
    specialty,
    doctor,
    date,
    time,
    observations,
    creatorId
  } = req.body;
  // Resolve doctor identifier (allows numeric id, colegiado, email or name)
  resolveProfessional(req, doctor, (errResolve, resolvedDoctor) => {
    if (errResolve) {
      console.warn('[APPOINTMENTS POST] could not resolve professional:', errResolve.message || errResolve);
      return res.status(400).json({ success: false, message: 'No se pudo resolver el doctor proporcionado. Use ID numérico, colegiado o correo.' });
    }

    // Verificar si ya existe una cita para el mismo doctor, fecha y hora (ignorar canceladas)
    const checkQuery = `SELECT * FROM citas WHERE Profesional_Responsable = ? AND Fecha = ? AND Hora = ? AND (Confirmado IS NULL OR Confirmado <> 'Cancelada')`;
    db.query(checkQuery, [resolvedDoctor, date, time], (err, results) => {
      if (err) {
        console.error('Error al verificar cita duplicada:', err);
        return res.status(500).json({ success: false, message: 'Error al verificar cita duplicada', error: err });
      }
      if (results.length > 0) {
        // Ya existe una cita en ese horario
        return res.status(400).json({ success: false, message: 'Ya existe una cita para este doctor en la fecha y hora seleccionada.' });
      }

      // Si no existe, crear la cita
      const insertQuery = `INSERT INTO citas (Paciente, Consulta_Especialidad, Profesional_Responsable, Fecha, Hora, Observaciones, Id_Creador, Tipo_Creador, Confirmado)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pendiente')`;
      const tipoMap = { paciente: 'Paciente', doctor: 'Doctor', secretaria: 'Secretaria', administrador: 'Administrador' };
      const creatorTypeNormalized = tipoMap[(req.body.creatorType || '').toString().toLowerCase()] || null;
      db.query(insertQuery, [
        patientDpi,
        specialty,
        resolvedDoctor,
        date,
        time,
        observations,
        creatorId,
        creatorTypeNormalized
      ], (errInsert, result) => {
        if (errInsert) {
          console.error('Error al crear cita:', errInsert);
          return res.status(500).json({ success: false, message: 'Error al crear cita', error: errInsert });
        }
        // Retornar la cita creada con datos completos
        const citaId = result.insertId;
        const joinQuery = `
          SELECT c.idCitas, c.Fecha, c.Hora, c.Observaciones, c.Confirmado,
            p.Nombres AS patientNames, p.Apellidos AS patientLastNames, p.DPI AS patientDpi, p.Telefono AS patientPhone, p.Correo AS patientEmail,
            e.Nombre AS specialtyName,
            d.Nombres AS doctorName, d.Apellidos AS doctorLastNames
          FROM citas c
          LEFT JOIN pacientes p ON c.Paciente = p.DPI
          LEFT JOIN especialidades e ON c.Consulta_Especialidad = e.idEspecialidades
          LEFT JOIN doctores d ON c.Profesional_Responsable = d.Colegiado
          WHERE c.idCitas = ?
        `;
        db.query(joinQuery, [citaId], (err2, results2) => {
          if (err2) {
            return res.status(500).json({ success: false, message: 'Cita creada pero error al consultar', error: err2 });
          }
          // Audit: appointment created
          insertAudit(req, 'appointment_create', 'appointment', citaId, null, JSON.stringify(results2[0]), (errAudit) => {
            if (errAudit) console.warn('Audit insert failed for appointment_create', errAudit);
            res.json({ success: true, appointment: results2[0] });
          });
        });
      });
    });
  });
});

// Obtener doctores por especialidad
app.get('/api/doctors/specialty/:id', (req, res) => {
  const specialtyId = req.params.id;
  const query = `
    SELECT d.* FROM doctores d
    JOIN especialidades_has_doctores ed ON d.Colegiado = ed.Doctores_Colegiado
    WHERE ed.Especialidades_idEspecialidades = ?
  `;
  db.query(query, [specialtyId], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener doctores por especialidad', error: err });
    }
    res.json({ success: true, doctors: results });
  });
});

// Obtener cita por ID
app.get('/api/appointments/:id', (req, res) => {
  const citaId = req.params.id;
  const joinQuery = `
    SELECT c.idCitas, c.Fecha, c.Hora, c.Observaciones, c.Confirmado,
      p.Nombres AS patientNames, p.Apellidos AS patientLastNames, p.DPI AS patientDpi, p.Telefono AS patientPhone, p.Correo AS patientEmail,
      e.Nombre AS specialtyName,
      d.Nombres AS doctorName, d.Apellidos AS doctorLastNames
    FROM citas c
    LEFT JOIN pacientes p ON c.Paciente = p.DPI
    LEFT JOIN especialidades e ON c.Consulta_Especialidad = e.idEspecialidades
    LEFT JOIN doctores d ON c.Profesional_Responsable = d.Colegiado
    WHERE c.idCitas = ?
  `;
  db.query(joinQuery, [citaId], (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al consultar cita por ID', error: err });
    }
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'No se encontró la cita con el ID proporcionado.' });
    }
    res.json({ success: true, appointment: results[0] });
  });
});

// Obtener citas por usuario (puede ser paciente por DPI o creador por id)
app.get('/api/appointments/user/:id', (req, res) => {
  const uid = req.params.id;
  // Try to find as numeric creator id first
  const qCreator = `SELECT c.idCitas, c.Fecha, c.Hora, c.Observaciones, c.Confirmado,
      p.Nombres AS patientNames, p.Apellidos AS patientLastNames, p.DPI AS patientDpi,
      e.Nombre AS specialtyName, d.Nombres AS doctorName, d.Apellidos AS doctorLastNames
    FROM citas c
    LEFT JOIN pacientes p ON c.Paciente = p.DPI
    LEFT JOIN especialidades e ON c.Consulta_Especialidad = e.idEspecialidades
    LEFT JOIN doctores d ON c.Profesional_Responsable = d.Colegiado
    WHERE c.Id_Creador = ? ORDER BY c.Fecha DESC, c.Hora DESC`;
  db.query(qCreator, [uid], (errC, rowsC) => {
    if (errC) return res.status(500).json({ success: false, message: 'Error reading appointments by creator', error: errC });
    if (rowsC && rowsC.length > 0) return res.json({ success: true, appointments: rowsC });
    // Otherwise try to treat uid as patient DPI
    const qPatient = `SELECT c.idCitas, c.Fecha, c.Hora, c.Observaciones, c.Confirmado,
      p.Nombres AS patientNames, p.Apellidos AS patientLastNames, p.DPI AS patientDpi,
      e.Nombre AS specialtyName, d.Nombres AS doctorName, d.Apellidos AS doctorLastNames
      FROM citas c
      LEFT JOIN pacientes p ON c.Paciente = p.DPI
      LEFT JOIN especialidades e ON c.Consulta_Especialidad = e.idEspecialidades
      LEFT JOIN doctores d ON c.Profesional_Responsable = d.Colegiado
      WHERE c.Paciente = ? ORDER BY c.Fecha DESC, c.Hora DESC`;
    db.query(qPatient, [uid], (errP, rowsP) => {
      if (errP) return res.status(500).json({ success: false, message: 'Error reading appointments by patient', error: errP });
      return res.json({ success: true, appointments: rowsP || [] });
    });
  });
});

// Confirmar cita (actualizar campo Confirmado a 'Confirmada')
app.put('/api/appointments/:id/confirm', (req, res) => {
  const citaId = req.params.id;
  // Read current status first for audit
  db.query('SELECT Confirmado FROM citas WHERE idCitas = ?', [citaId], (errS, rows) => {
    if (errS) return res.status(500).json({ success: false, message: 'Error al leer la cita', error: errS });
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'No se encontró la cita para confirmar.' });
    const oldStatus = rows[0].Confirmado || null;
    db.query('UPDATE citas SET Confirmado = ? WHERE idCitas = ?', ['Confirmada', citaId], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al confirmar la cita', error: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'No se encontró la cita para confirmar.' });
      }
      // Audit: appointment confirmed (include old value)
      insertAudit(req, 'appointment_confirm', 'appointment', citaId, oldStatus, 'Confirmada', (errAudit) => {
        if (errAudit) console.warn('Audit insert failed for appointment_confirm', errAudit);
        return res.json({ success: true, message: 'Cita confirmada correctamente.', updatedStatus: 'Confirmada' });
      });
    });
  });
});

// Cancelar cita (actualizar campo Confirmado a 'Cancelada')
app.put('/api/appointments/:id/cancel', (req, res) => {
  const citaId = req.params.id;
  // Read current status first for audit
  db.query('SELECT Confirmado FROM citas WHERE idCitas = ?', [citaId], (errS, rows) => {
    if (errS) return res.status(500).json({ success: false, message: 'Error al leer la cita', error: errS });
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'No se encontró la cita para cancelar.' });
    const oldStatus = rows[0].Confirmado || null;
    db.query('UPDATE citas SET Confirmado = ? WHERE idCitas = ?', ['Cancelada', citaId], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al cancelar la cita', error: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'No se encontró la cita para cancelar.' });
      }
      // Audit: appointment canceled (include old value)
      insertAudit(req, 'appointment_cancel', 'appointment', citaId, oldStatus, 'Cancelada', (errAudit) => {
        if (errAudit) console.warn('Audit insert failed for appointment_cancel', errAudit);
        return res.json({ success: true, message: 'Cita cancelada correctamente.', updatedStatus: 'Cancelada' });
      });
    });
  });
});

// Undo last appointment change (restore previous Confirmado value)
app.post('/api/appointments/:id/undo', (req, res) => {
  const citaId = req.params.id;
  // Find last audit for this appointment that changed status
  const q = `SELECT * FROM audit_log WHERE resource_type = 'appointment' AND resource_id = ? ORDER BY id DESC LIMIT 1`;
  db.query(q, [citaId], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: 'Error reading audit log', error: err });
    if (!rows || rows.length === 0) return res.status(404).json({ success: false, message: 'No audit record found to undo.' });
    const last = rows[0];
    const oldVal = last.old_value || null;
    // Read current status for audit
    db.query('SELECT Confirmado FROM citas WHERE idCitas = ?', [citaId], (errR, curRows) => {
      if (errR) return res.status(500).json({ success: false, message: 'Error reading current appointment', error: errR });
      if (!curRows || curRows.length === 0) return res.status(404).json({ success: false, message: 'Appointment not found' });
      const current = curRows[0].Confirmado || null;
      const restoreValue = oldVal === null || oldVal === 'null' ? 'Pendiente' : oldVal;
      db.query('UPDATE citas SET Confirmado = ? WHERE idCitas = ?', [restoreValue, citaId], (errU, resultU) => {
        if (errU) return res.status(500).json({ success: false, message: 'Error restoring appointment status', error: errU });
        // Insert audit record for undo action
        insertAudit(req, 'appointment_undo', 'appointment', citaId, current, restoreValue, (errA) => {
          if (errA) console.warn('Audit insert failed for appointment_undo', errA);
          return res.json({ success: true, message: 'Appointment status restored', restoredTo: restoreValue });
        });
      });
    });
  });
});

// Improved undo endpoint for an audit entry (supports appointment restores)
// Catch-all de depuración para la ruta undo, para observar los métodos entrantes
app.all('/api/audit/:auditId/undo', (req, res, next) => {
  console.log('[DEBUG ALL] method=%s path=%s', req.method, req.originalUrl);
  // If POST, let the next handler handle it (we still have a post handler)
  if (req.method === 'POST') return next();
  // De lo contrario responder 'método no permitido'
  res.status(405).json({ success: false, message: 'Method not allowed for undo path' });
});

app.post('/api/audit/:auditId/undo', (req, res) => {
  const auditId = req.params.auditId;
  console.log('[DEBUG] /api/audit/%s/undo called from', auditId, req.ip || req.connection.remoteAddress);
  db.query('SELECT * FROM audit_log WHERE id = ?', [auditId], (errA, rowsA) => {
    if (errA) return res.status(500).json({ success: false, message: 'Error reading audit entry', error: errA });
    if (!rowsA || rowsA.length === 0) return res.status(404).json({ success: false, message: 'Audit entry not found' });
    const audit = rowsA[0];
    if (audit.resource_type !== 'appointment') return res.status(400).json({ success: false, message: 'Undo only supported for appointment audit entries' });
    const resourceId = audit.resource_id;

    // Read current appointment row (if exists)
    db.query('SELECT * FROM citas WHERE idCitas = ?', [resourceId], (errCur, curRows) => {
      if (errCur) return res.status(500).json({ success: false, message: 'Error reading current appointment', error: errCur });
      const currentRow = (curRows && curRows.length > 0) ? curRows[0] : null;
      const currentJson = currentRow ? JSON.stringify(currentRow) : null;

  // Try to parse old and new values
      let parsedOld = null;
      let parsedNew = null;
      try { parsedOld = audit.old_value ? JSON.parse(audit.old_value) : null; } catch(e) { parsedOld = null; }
      try { parsedNew = audit.new_value ? JSON.parse(audit.new_value) : null; } catch(e) { parsedNew = null; }

  console.log('[DEBUG UNDO] audit.id=%s event=%s old_value=%o new_value=%o parsedOld=%o parsedNew=%o', audit.id, audit.event_type, audit.old_value, audit.new_value, parsedOld, parsedNew);

      const allowedCols = ['idCitas','Paciente','Consulta_Especialidad','Profesional_Responsable','Fecha','Hora','Observaciones','Id_Creador','Tipo_Creador','Confirmado'];

      const finishWithAudit = (oldVal, newVal, cb) => {
        insertAudit(req, 'appointment_undo', 'appointment', resourceId, oldVal, newVal, (errIns) => {
          if (errIns) console.warn('Audit insert failed for appointment_undo', errIns);
          return cb(errIns);
        });
      };

      // Case 1: full old object exists -> restore fields
      if (parsedOld && typeof parsedOld === 'object') {
        // Build SET for allowed columns
        const setCols = [];
        const params = [];
        allowedCols.forEach(col => {
          if (Object.prototype.hasOwnProperty.call(parsedOld, col) && col !== 'idCitas') {
            setCols.push(`${col} = ?`);
            params.push(parsedOld[col]);
          }
        });
        if (setCols.length === 0) {
          return res.status(400).json({ success: false, message: 'Old audit value does not contain recognizable appointment fields to restore.' });
        }
        // If appointment exists -> UPDATE, else -> INSERT
        if (currentRow) {
          const sql = `UPDATE citas SET ${setCols.join(', ')} WHERE idCitas = ?`;
          params.push(resourceId);
          db.query(sql, params, (errU) => {
            if (errU) return res.status(500).json({ success: false, message: 'Error restoring appointment', error: errU });
            const restoredJson = JSON.stringify(parsedOld);
            finishWithAudit(currentJson, restoredJson, (errFin) => {
              return res.json({ success: true, message: 'Appointment restored (update)', restoredTo: parsedOld });
            });
          });
        } else {
          // Try to insert including idCitas if present
          const cols = [];
          const vals = [];
          const placeholders = [];
          allowedCols.forEach(col => {
            if (Object.prototype.hasOwnProperty.call(parsedOld, col)) {
              cols.push(col);
              vals.push(parsedOld[col]);
              placeholders.push('?');
            }
          });
          const sqlIns = `INSERT INTO citas (${cols.join(',')}) VALUES (${placeholders.join(',')})`;
          db.query(sqlIns, vals, (errI) => {
            if (errI) return res.status(500).json({ success: false, message: 'Error reinserting appointment', error: errI });
            const restoredJson = JSON.stringify(parsedOld);
            finishWithAudit(currentJson, restoredJson, (errFin) => {
              return res.json({ success: true, message: 'Appointment restored (re-inserted)', restoredTo: parsedOld });
            });
          });
        }
        return;
      }

      // Case 2: old_value is null and new_value is full -> this was a create, so undo = delete
      if (!parsedOld && parsedNew && typeof parsedNew === 'object') {
        // Delete the appointment if exists
        if (!currentRow) return res.status(404).json({ success: false, message: 'Appointment not found to delete as undo of create.' });
        db.query('DELETE FROM citas WHERE idCitas = ?', [resourceId], (errD) => {
          if (errD) return res.status(500).json({ success: false, message: 'Error deleting appointment', error: errD });
          finishWithAudit(currentJson, null, (errFin) => {
            return res.json({ success: true, message: 'Appointment deleted (undo of create)' });
          });
        });
        return;
      }

      // Case 3: simple scalar old_value -> likely Confirmado field change OR old_value null but event_type indicates status change
      if ((!parsedOld && typeof audit.new_value === 'string') || (audit.old_value !== null && audit.old_value !== undefined && !parsedOld)) {
        // Determine restore value: prefer old_value when present, otherwise default to 'Pendiente'
        const restoreVal = (audit.old_value === null || audit.old_value === 'null') ? 'Pendiente' : (parsedOld || audit.old_value);
        db.query('UPDATE citas SET Confirmado = ? WHERE idCitas = ?', [restoreVal, resourceId], (errR) => {
          if (errR) return res.status(500).json({ success: false, message: 'Error restoring appointment status', error: errR });
          finishWithAudit(currentJson, restoreVal, (errFin) => {
            return res.json({ success: true, message: 'Appointment status restored', restoredTo: restoreVal });
          });
        });
        return;
      }

      return res.status(400).json({ success: false, message: 'Unable to determine undo action for this audit entry.' });
    });
  });
});

// Obtener todos los doctores
app.get('/api/doctores', (req, res) => {
  db.query("SELECT * FROM doctores WHERE Activo = 'SI'", (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener doctores', error: err });
    }
    res.json({ success: true, data: results });
  });
});

// Obtener todos los administradores
// Protected: only authenticated administrators
app.get('/api/administradores', authenticateToken, authorizeRole('administrador'), (req, res) => {
  db.query("SELECT * FROM administradores WHERE Activo = 'SI'", (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Error al obtener administradores', error: err });
    }
    res.json({ success: true, data: results });
  });
});
// Editar información de usuario (paciente, doctor, secretaria, administrador)
app.put('/api/:tipo/:id', (req, res, next) => {
  const { tipo, id } = req.params;
  // If the route is for settings, let the dedicated settings handlers handle it
  if ((tipo || '').toString().toLowerCase() === 'settings') {
    return next();
  }
  const data = req.body;
  let table = '';
  let idField = '';
  switch (tipo.toLowerCase()) {
    case 'pacientes':
      table = 'pacientes';
      idField = 'DPI';
      break;
    case 'doctores':
      table = 'doctores';
      idField = 'Colegiado';
      break;
    case 'secretarias':
      table = 'secretarias';
      idField = 'idSecretarias';
      break;
    case 'administradores':
      table = 'administradores';
      idField = 'idAdministradores';
      break;
    default:
      return res.status(400).json({ success: false, message: 'Tipo de usuario no válido' });
  }
  // Read old row first for audit
  db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errSel, rowsSel) => {
    if (errSel) return res.status(500).json({ success: false, message: 'Error leyendo registro previo', error: errSel });
    if (!rowsSel || rowsSel.length === 0) return res.status(404).json({ success: false, message: 'Registro no encontrado para actualizar.' });
    const oldRow = rowsSel[0];

    // Construir SET dinámico pero sólo con columnas permitidas por tabla
    const columnMapByTable = {
      pacientes: { dpi: 'DPI', nombres: 'Nombres', apellidos: 'Apellidos', telefono: 'Telefono', correo: 'Correo', activo: 'Activo' },
      doctores: { colegiado: 'Colegiado', nombres: 'Nombres', apellidos: 'Apellidos', telefono: 'Telefono', correo: 'Correo', activo: 'Activo', especialidad: 'Especialidad' },
      secretarias: { idsecretarias: 'idSecretarias', nombres: 'Nombres', apellidos: 'Apellidos', telefono: 'Telefono', correo: 'Correo', activo: 'Activo' },
      administradores: { idadministradores: 'idAdministradores', nombres: 'Nombres', apellidos: 'Apellidos', correo: 'Correo', activo: 'Activo' },
      usuarios: { correo: 'correo', contrasenia: 'contrasenia', tipo: 'Tipo', tipo_lower: 'Tipo', estado: 'Estado', estado_upper: 'Estado' }
    };

    const mapForTable = columnMapByTable[table] || {};
    const setParts = [];
    const values = [];

    for (const [rawKey, rawVal] of Object.entries(data)) {
      const key = (rawKey || '').toString();
      const low = key.toLowerCase();
      if (mapForTable[low]) {
        const colName = mapForTable[low];
        let val = rawVal;
        // Normalize 'Activo' / 'Estado' values to 'Si'/'No'
        if (colName === 'Activo' || colName === 'Estado') {
          if (typeof val === 'boolean') val = val ? 'Si' : 'No';
          else if (typeof val === 'number') val = (val === 1) ? 'Si' : 'No';
          else if (typeof val === 'string') {
            const up = val.toUpperCase();
            if (up === 'SI' || up === 'S' || up === 'YES' || up === 'Y' || up === '1') val = 'Si';
            else val = 'No';
          }
        }
        // Map common lowercase column aliases (nombres, apellidos) preserve casing used in DB
        setParts.push(`${colName} = ?`);
        values.push(val);
      } else {
        // skip unknown fields (e.g., id, tipo, idUsuarios) to avoid SQL errors
        continue;
      }
    }

    if (setParts.length === 0) {
      return res.status(400).json({ success: false, message: 'No hay campos válidos para actualizar.' });
    }

    const query = `UPDATE ${table} SET ${setParts.join(', ')} WHERE ${idField} = ?`;
    // Perform update in a DB transaction so we can also sync the Usuarios table by correo
    db.beginTransaction((txErr) => {
      if (txErr) {
        console.error('[TX BEGIN] error:', txErr);
        return res.status(500).json({ success: false, message: 'Error iniciando transacción', error: txErr });
      }

      db.query(query, [...values, id], (err, result) => {
        if (err) {
          console.error('[TX] Error updating entity table:', err);
          return db.rollback(() => res.status(500).json({ success: false, message: 'Error al actualizar usuario', error: err }));
        }

        // After updating the entity table, attempt to find corresponding usuario by correo
        // Prefer new correo provided in request body; otherwise use oldRow's correo
        const newCorreo = (data && (data.Correo || data.correo)) ? (data.Correo || data.correo) : null;
        const correoToFind = newCorreo || (oldRow && (oldRow.Correo || oldRow.correo));

        if (!correoToFind) {
          // Nothing to sync to usuarios; commit and finish
          db.commit((cErr) => {
            if (cErr) {
              console.error('[TX COMMIT] error (no correo):', cErr);
              return db.rollback(() => res.status(500).json({ success: false, message: 'Error finalizando transacción', error: cErr }));
            }
            // Read new row for audit
            db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errNew, rowsNew) => {
              if (errNew) return res.status(500).json({ success: false, message: 'Error leyendo registro actualizado', error: errNew });
              const newRow = (rowsNew && rowsNew.length > 0) ? rowsNew[0] : null;
              insertAudit(req, 'user_update', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow), (errA) => {
                if (errA) console.warn('Audit insert failed for user_update', errA);
                return res.json({ success: true, message: 'Usuario actualizado correctamente' });
              });
            });
          });
          return;
        }

        // Find usuario by correo
        db.query('SELECT * FROM usuarios WHERE correo = ? LIMIT 1', [correoToFind], (errUsrSel, usrRows) => {
          if (errUsrSel) {
            console.error('[TX] Error selecting usuario by correo:', errUsrSel);
            return db.rollback(() => res.status(500).json({ success: false, message: 'Error buscando usuario para sincronizar', error: errUsrSel }));
          }

          if (!usrRows || usrRows.length === 0) {
            // No matching usuario; just commit and finish
            db.commit((cErr2) => {
              if (cErr2) {
                console.error('[TX COMMIT] error (no usuario):', cErr2);
                return db.rollback(() => res.status(500).json({ success: false, message: 'Error finalizando transacción', error: cErr2 }));
              }
              // Read new row for audit
              db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errNew2, rowsNew2) => {
                if (errNew2) return res.status(500).json({ success: false, message: 'Error leyendo registro actualizado', error: errNew2 });
                const newRow2 = (rowsNew2 && rowsNew2.length > 0) ? rowsNew2[0] : null;
                insertAudit(req, 'user_update', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow2), (errA2) => {
                  if (errA2) console.warn('Audit insert failed for user_update', errA2);
                  return res.json({ success: true, message: 'Usuario actualizado correctamente (no se encontró usuario asociado)' });
                });
              });
            });
            return;
          }

          const usuario = usrRows[0];
          const idUsuarios = usuario.idUsuarios;

          // Build update for usuarios based on provided fields
          const userUpdateFields = [];
          const userUpdateValues = [];

          // If correo changed, update usuarios.correo
          if (data && (data.Correo || data.correo)) {
            userUpdateFields.push('correo = ?');
            userUpdateValues.push(data.Correo || data.correo);
          }
          // If tipo/Tipo provided, update usuarios.Tipo (normalize)
          if (data && (data.tipo || data.Tipo)) {
            userUpdateFields.push('Tipo = ?');
            userUpdateValues.push((data.tipo || data.Tipo).toString().toLowerCase());
          }
          // If Activo provided for entity, sync to usuarios.Estado
          if (typeof data.Activo !== 'undefined' || typeof data.activo !== 'undefined') {
            const activoVal = (typeof data.Activo !== 'undefined') ? data.Activo : data.activo;
            let estado = null;
            if (typeof activoVal === 'string') estado = (activoVal.toUpperCase() === 'SI') ? 'Si' : 'No';
            if (typeof activoVal === 'boolean') estado = activoVal ? 'Si' : 'No';
            if (typeof activoVal === 'number') estado = (activoVal === 1) ? 'Si' : 'No';
            if (estado !== null) {
              userUpdateFields.push('Estado = ?');
              userUpdateValues.push(estado);
            }
          }

          if (userUpdateFields.length === 0) {
            // Nothing to update in usuarios; commit and finish
            db.commit((cErr3) => {
              if (cErr3) {
                console.error('[TX COMMIT] error (no update fields):', cErr3);
                return db.rollback(() => res.status(500).json({ success: false, message: 'Error finalizando transacción', error: cErr3 }));
              }
              db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errNew3, rowsNew3) => {
                if (errNew3) return res.status(500).json({ success: false, message: 'Error leyendo registro actualizado', error: errNew3 });
                const newRow3 = (rowsNew3 && rowsNew3.length > 0) ? rowsNew3[0] : null;
                insertAudit(req, 'user_update', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow3), (errA3) => {
                  if (errA3) console.warn('Audit insert failed for user_update', errA3);
                  return res.json({ success: true, message: 'Usuario actualizado correctamente' });
                });
              });
            });
            return;
          }

          // Execute update on usuarios
          const usrQuery = `UPDATE usuarios SET ${userUpdateFields.join(', ')} WHERE idUsuarios = ?`;
          db.query(usrQuery, [...userUpdateValues, idUsuarios], (errUsrUpd, resUsrUpd) => {
            if (errUsrUpd) {
              console.error('[TX] Error updating usuarios:', errUsrUpd);
              return db.rollback(() => res.status(500).json({ success: false, message: 'Error actualizando tabla usuarios', error: errUsrUpd }));
            }

            // Commit transaction
            db.commit((commitErr) => {
              if (commitErr) {
                console.error('[TX COMMIT] error:', commitErr);
                return db.rollback(() => res.status(500).json({ success: false, message: 'Error finalizando transacción', error: commitErr }));
              }

              // Read new rows for audit
              db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errNew4, rowsNew4) => {
                if (errNew4) return res.status(500).json({ success: false, message: 'Error leyendo registro actualizado', error: errNew4 });
                const newRow4 = (rowsNew4 && rowsNew4.length > 0) ? rowsNew4[0] : null;
                // Read updated usuario
                db.query('SELECT * FROM usuarios WHERE idUsuarios = ?', [idUsuarios], (errUsrSel2, usrRows2) => {
                  const newUsuarioRow = (usrRows2 && usrRows2.length > 0) ? usrRows2[0] : null;
                  insertAudit(req, 'user_update', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow4), (errA4) => {
                    if (errA4) console.warn('Audit insert failed for user_update', errA4);
                    // Also audit the usuarios update
                    insertAudit(req, 'usuario_sync', 'user', idUsuarios, JSON.stringify(usuario), JSON.stringify(newUsuarioRow), (errA5) => {
                      if (errA5) console.warn('Audit insert failed for usuario_sync', errA5);
                      return res.json({ success: true, message: 'Usuario actualizado correctamente y sincronizado con tabla usuarios' });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
});

// Dar de baja (inactivar) usuario
// Dar de baja (inactivar) usuario en la tabla Usuarios
app.patch('/api/usuarios/:id/inactivate', (req, res) => {
  const { id } = req.params;
  const query = `UPDATE usuarios SET Estado = 'No' WHERE idUsuarios = ?`;
  console.log('[INACTIVATE USUARIO] id recibido:', id);
  // Read old row
  db.query('SELECT * FROM usuarios WHERE idUsuarios = ?', [id], (errSel, rowsSel) => {
    if (errSel) return res.status(500).json({ success: false, message: 'Error leyendo usuario previo', error: errSel });
    if (!rowsSel || rowsSel.length === 0) return res.status(404).json({ success: false, message: 'No se encontró el usuario para dar de baja.' });
    const oldRow = rowsSel[0];
    db.query(query, [id], (err, result) => {
      console.log('[INACTIVATE USUARIO] result:', result);
      if (err) {
        console.error('[INACTIVATE USUARIO] error:', err);
        return res.status(500).json({ success: false, message: 'Error al dar de baja usuario en Usuarios', error: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'No se encontró el usuario para dar de baja.' });
      }
      // Read new row
      db.query('SELECT * FROM usuarios WHERE idUsuarios = ?', [id], (errNew, rowsNew) => {
        if (errNew) return res.status(500).json({ success: false, message: 'Error leyendo usuario después de inactivar', error: errNew });
        const newRow = (rowsNew && rowsNew.length > 0) ? rowsNew[0] : null;
        insertAudit(req, 'user_inactivate', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow), (errA) => {
          if (errA) console.warn('Audit insert failed for user_inactivate', errA);
          res.json({ success: true, message: 'Usuario dado de baja correctamente en Usuarios' });
        });
      });
    });
  });
});

// Dar de baja (inactivar) usuario por tipo (pacientes/doctores/secretarias/administradores)
app.patch('/api/:tipo/:id/inactivate', authenticateToken, (req, res) => {
  const { tipo, id } = req.params;
  // Si el tipo objetivo es administradores, asegurar que el solicitante sea administrador
  if (tipo && tipo.toLowerCase() === 'administradores') {
    const user = req.user || null;
    if (!user || ((user.tipo || user.role) || '').toString().toLowerCase() !== 'administrador') {
      return res.status(403).json({ success: false, message: 'No autorizado para inactivar administradores' });
    }
  }
  let table = '';
  let idField = '';
  switch (tipo.toLowerCase()) {
    case 'pacientes':
      table = 'pacientes';
      idField = 'DPI';
      break;
    case 'doctores':
      table = 'doctores';
      idField = 'Colegiado';
      break;
    case 'secretarias':
      table = 'secretarias';
      idField = 'idSecretarias';
      break;
    case 'administradores':
      table = 'administradores';
      idField = 'idAdministradores';
      break;
    default:
      return res.status(400).json({ success: false, message: 'Tipo de usuario no válido' });
  }
  let query;
  if (table === 'usuarios') {
    query = `UPDATE usuarios SET Estado = 'No' WHERE ${idField} = ?`;
  } else {
    query = `UPDATE ${table} SET Activo = 'NO' WHERE ${idField} = ?`;
  }
  // Read old row
  db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errSel, rowsSel) => {
    if (errSel) return res.status(500).json({ success: false, message: 'Error leyendo registro previo', error: errSel });
    if (!rowsSel || rowsSel.length === 0) return res.status(404).json({ success: false, message: 'No se encontró el registro para inactivar.' });
    const oldRow = rowsSel[0];
    db.query(query, [id], (err, result) => {
      if (err) {
        console.error('[INACTIVATE BY TYPE] error:', err);
        return res.status(500).json({ success: false, message: 'Error al inactivar usuario por tipo', error: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'No se encontró el registro para inactivar.' });
      }
      db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errNew, rowsNew) => {
        if (errNew) return res.status(500).json({ success: false, message: 'Error leyendo registro después de inactivar', error: errNew });
        const newRow = (rowsNew && rowsNew.length > 0) ? rowsNew[0] : null;
        insertAudit(req, 'entity_inactivate', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow), (errA) => {
          if (errA) console.warn('Audit insert failed for entity_inactivate', errA);
          res.json({ success: true, message: 'Registro inactivado correctamente' });
        });
      });
    });
  });
});

// Dar de alta (activar) usuario en la tabla Usuarios
app.patch('/api/usuarios/:id/activate', (req, res) => {
  const { id } = req.params;
  const query = `UPDATE usuarios SET Estado = 'Si' WHERE idUsuarios = ?`;
  console.log('[ACTIVATE USUARIO] id recibido:', id);
  db.query('SELECT * FROM usuarios WHERE idUsuarios = ?', [id], (errSel, rowsSel) => {
    if (errSel) return res.status(500).json({ success: false, message: 'Error leyendo usuario previo', error: errSel });
    if (!rowsSel || rowsSel.length === 0) return res.status(404).json({ success: false, message: 'No se encontró el usuario para activar.' });
    const oldRow = rowsSel[0];
    db.query(query, [id], (err, result) => {
      console.log('[ACTIVATE USUARIO] result:', result);
      if (err) {
        console.error('[ACTIVATE USUARIO] error:', err);
        return res.status(500).json({ success: false, message: 'Error al activar usuario en Usuarios', error: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'No se encontró el usuario para activar.' });
      }
      db.query('SELECT * FROM usuarios WHERE idUsuarios = ?', [id], (errNew, rowsNew) => {
        if (errNew) return res.status(500).json({ success: false, message: 'Error leyendo usuario después de activar', error: errNew });
        const newRow = (rowsNew && rowsNew.length > 0) ? rowsNew[0] : null;
        insertAudit(req, 'user_activate', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow), (errA) => {
          if (errA) console.warn('Audit insert failed for user_activate', errA);
          res.json({ success: true, message: 'Usuario activado correctamente en Usuarios' });
        });
      });
    });
  });
});

// Dar de alta (activar) usuario por tipo (pacientes/doctores/secretarias/administradores)
app.patch('/api/:tipo/:id/activate', authenticateToken, (req, res) => {
  const { tipo, id } = req.params;
  let table = '';
  let idField = '';
  switch (tipo.toLowerCase()) {
    case 'pacientes':
      table = 'pacientes';
      idField = 'DPI';
      break;
    case 'doctores':
      table = 'doctores';
      idField = 'Colegiado';
      break;
    case 'secretarias':
      table = 'secretarias';
      idField = 'idSecretarias';
      break;
    case 'administradores':
      table = 'administradores';
      idField = 'idAdministradores';
      break;
    default:
      return res.status(400).json({ success: false, message: 'Tipo de usuario no válido' });
  }
  let query;
  if (table === 'usuarios') {
    query = `UPDATE usuarios SET Estado = 'Si' WHERE ${idField} = ?`;
  } else {
    query = `UPDATE ${table} SET Activo = 'SI' WHERE ${idField} = ?`;
  }
  // Read old row
  db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errSel, rowsSel) => {
    if (errSel) return res.status(500).json({ success: false, message: 'Error leyendo registro previo', error: errSel });
    if (!rowsSel || rowsSel.length === 0) return res.status(404).json({ success: false, message: 'No se encontró el registro para activar.' });
    const oldRow = rowsSel[0];
    db.query(query, [id], (err, result) => {
      if (err) {
        console.error('[ACTIVATE BY TYPE] error:', err);
        return res.status(500).json({ success: false, message: 'Error al activar usuario por tipo', error: err });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ success: false, message: 'No se encontró el registro para activar.' });
      }
      db.query(`SELECT * FROM ${table} WHERE ${idField} = ?`, [id], (errNew, rowsNew) => {
        if (errNew) return res.status(500).json({ success: false, message: 'Error leyendo registro después de activar', error: errNew });
        const newRow = (rowsNew && rowsNew.length > 0) ? rowsNew[0] : null;
        insertAudit(req, 'entity_activate', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow), (errA) => {
          if (errA) console.warn('Audit insert failed for entity_activate', errA);
          res.json({ success: true, message: 'Registro activado correctamente' });
        });
      });
    });
  });
});

// Actualizar datos en la tabla usuarios
app.put('/api/usuarios/:id', (req, res) => {
  const { id } = req.params;
  const data = req.body || {};
  // Read old row
  db.query('SELECT * FROM usuarios WHERE idUsuarios = ?', [id], (errSel, rowsSel) => {
    if (errSel) return res.status(500).json({ success: false, message: 'Error leyendo usuario previo', error: errSel });
    if (!rowsSel || rowsSel.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    const oldRow = rowsSel[0];
    // Construir SET dinámico
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const query = `UPDATE usuarios SET ${fields} WHERE idUsuarios = ?`;
    db.query(query, [...values, id], (err, result) => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Error al actualizar usuario en tabla usuarios', error: err });
      }
      // Read new row
      db.query('SELECT * FROM usuarios WHERE idUsuarios = ?', [id], (errNew, rowsNew) => {
        if (errNew) return res.status(500).json({ success: false, message: 'Error leyendo usuario actualizado', error: errNew });
        const newRow = (rowsNew && rowsNew.length > 0) ? rowsNew[0] : null;
        insertAudit(req, 'user_update', 'user', id, JSON.stringify(oldRow), JSON.stringify(newRow), (errA) => {
          if (errA) console.warn('Audit insert failed for user_update', errA);
          res.json({ success: true, message: 'Usuario actualizado correctamente en tabla usuarios' });
        });
      });
    });
  });
});

// Settings endpoints
app.get('/api/settings/:key', (req, res) => {
  const key = req.params.key;
  // Use DB-specific quoting to avoid syntax issues across MySQL/Postgres
  const isPg = (db && db.dbType === 'postgres');
  const selectSql = isPg
    ? 'SELECT value FROM site_settings WHERE key = ?'
    : 'SELECT `value` FROM site_settings WHERE `key` = ?';
  db.query(selectSql, [key], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error reading setting', error: err });
    if (!results || results.length === 0) return res.json({ success: true, value: null });
    // For Postgres adapter, db.query returns rows array directly
    const row = Array.isArray(results) ? results[0] : results && results.rows ? results.rows[0] : null;
    const val = row ? (row.value ?? null) : null;
    return res.json({ success: true, value: val });
  });
});

app.put('/api/settings/:key', (req, res) => {
  try {
    const key = req.params.key;
    const value = req.body && Object.prototype.hasOwnProperty.call(req.body, 'value') ? req.body.value : undefined;
    console.log(`[SETTINGS PUT] key=${key} typeof(value)=${typeof value}`);
    // Basic validation: require value (allow empty string but not undefined)
    if (typeof value === 'undefined') {
      console.warn('[SETTINGS PUT] Missing "value" in request body');
      return res.status(400).json({ success: false, message: 'Missing "value" in request body' });
    }
  // Read old value first for audit (use DB-specific quoting)
  const isPg = (db && db.dbType === 'postgres');
  const selectSql = isPg ? 'SELECT value FROM site_settings WHERE key = ?' : 'SELECT `value` FROM site_settings WHERE `key` = ?';
  db.query(selectSql, [key], (errSel, resultsSel) => {
      if (errSel) {
        console.error('[SETTINGS PUT] Error selecting old value:', errSel);
        return res.status(500).json({ success: false, message: 'Error reading old setting', error: errSel });
      }
      const oldValue = (resultsSel && resultsSel[0] && resultsSel[0].value) ? resultsSel[0].value : null;

      // Upsert new value (use DB-specific UPSERT syntax)
      const upsertSql = isPg
        ? 'INSERT INTO site_settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value'
        : 'INSERT INTO site_settings (`key`,`value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?';
      const upsertParams = isPg ? [key, value] : [key, value, value];
      db.query(upsertSql, upsertParams, (errUp) => {
        if (errUp) {
          console.error('[SETTINGS PUT] DB error on upsert:', errUp);
          return res.status(500).json({ success: false, message: 'Error saving setting', error: errUp });
        }

        // Try to extract user info from Authorization header (Bearer token)
        let changedBy = null;
        try {
          const auth = req.headers && req.headers.authorization ? req.headers.authorization : null;
          if (auth && auth.toString().toLowerCase().startsWith('bearer ')) {
            const token = auth.split(' ')[1];
            try {
              const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secreto');
              // prefer email if present, otherwise userId
              changedBy = decoded.email || decoded.userId || String(decoded.userId || decoded.email || 'unknown');
            } catch (exToken) {
              console.warn('[SETTINGS PUT] Could not verify token for audit:', exToken && exToken.message ? exToken.message : exToken);
            }
          }
        } catch (ex) {
          console.warn('[SETTINGS PUT] Error extracting auth token for audit:', ex);
        }

        // Insert audit record
        const auditSql = isPg
          ? 'INSERT INTO site_settings_audit (key, old_value, new_value, changed_by) VALUES (?, ?, ?, ?)'
          : 'INSERT INTO site_settings_audit (`key`, old_value, new_value, changed_by) VALUES (?, ?, ?, ?)';
        db.query(auditSql, [key, oldValue, value, changedBy], (errAudit) => {
          if (errAudit) {
            console.error('[SETTINGS PUT] Failed to insert audit record:', errAudit);
            // continue and return success for the upsert, but inform in logs
          } else {
            console.log(`[SETTINGS PUT] Audit inserted for key=${key} by=${changedBy || 'anonymous'}`);
          }
          console.log(`[SETTINGS PUT] Saved key=${key}`);
          return res.json({ success: true, message: 'Setting saved' });
        });
      });
    });
  } catch (ex) {
    console.error('[SETTINGS PUT] Unexpected error:', ex);
    return res.status(500).json({ success: false, message: 'Unexpected server error', error: String(ex) });
  }
});

// User preferences endpoints
app.get('/api/users/:id/preferences', (req, res) => {
  const id = req.params.id;
  // Column in schema is key_name; quote identifiers per-DB to avoid reserved word issues
  const isPg = (db && db.dbType === 'postgres');
  const sql = isPg
    ? 'SELECT key_name AS key, value FROM user_preferences WHERE userId = ?'
    : 'SELECT `key_name` AS `key`, `value` FROM user_preferences WHERE userId = ?';
  db.query(sql, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error reading preferences', error: err });
    const prefs = {};
    (results || []).forEach(r => { if (r && Object.prototype.hasOwnProperty.call(r, 'key')) prefs[r.key] = r.value; });
    return res.json({ success: true, preferences: prefs });
  });
});

app.put('/api/users/:id/preferences', (req, res) => {
  const id = req.params.id;
  const prefs = req.body || {};
  const entries = Object.entries(prefs);
  if (entries.length === 0) return res.status(400).json({ success: false, message: 'No preferences provided' });

  const isPg = (db && db.dbType === 'postgres');
  const params = [];

  if (isPg) {
    // Postgres: use INSERT ... ON CONFLICT (userId, key_name) DO UPDATE SET value = EXCLUDED.value
    const placeholders = entries.map((_, i) => `($${i*3+1}, $${i*3+2}, $${i*3+3})`).join(',');
    const sql = `INSERT INTO user_preferences (userId, key_name, value) VALUES ${placeholders} ON CONFLICT (userId, key_name) DO UPDATE SET value = EXCLUDED.value`;
    entries.forEach(([k, v]) => { params.push(id, k, String(v)); });
    return db.query(sql, params, (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Error saving preferences', error: err });
      return res.json({ success: true, message: 'Preferences saved' });
    });
  }

  // MySQL: use INSERT ... ON DUPLICATE KEY UPDATE
  const placeholders = entries.map(() => '(?,?,?)').join(',');
  const sql = `INSERT INTO user_preferences (userId, \`key_name\`, \`value\`) VALUES ${placeholders} ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`;
  entries.forEach(([k, v]) => { params.push(id, k, String(v)); });
  db.query(sql, params, (err) => {
    if (err) return res.status(500).json({ success: false, message: 'Error saving preferences', error: err });
    return res.json({ success: true, message: 'Preferences saved' });
  });
});

// Return audit records (site_settings_audit)
app.get('/api/audit', (req, res) => {
  const limit = Math.min(1000, parseInt(req.query.limit) || 100);
  const offset = parseInt(req.query.offset) || 0;
  const event = req.query.event || null;
  const resource = req.query.resource || null;
  const resourceId = req.query.resource_id || req.query.resourceId || null;
  const user = req.query.user || null;
  const since = req.query.since || null; // ISO date
  const until = req.query.until || null;

  let where = [];
  const params = [];
  if (event) { where.push('event_type = ?'); params.push(event); }
  if (resource) { where.push('resource_type = ?'); params.push(resource); }
  if (resourceId) { where.push('resource_id = ?'); params.push(resourceId); }
  if (user) { where.push('changed_by = ?'); params.push(user); }
  if (since) { where.push('created_at >= ?'); params.push(since); }
  if (until) { where.push('created_at <= ?'); params.push(until); }

  const whereClause = where.length > 0 ? ('WHERE ' + where.join(' AND ')) : '';
  const sql = `SELECT id, event_type, resource_type, resource_id, SUBSTR(old_value,1,500) AS old_preview, SUBSTR(new_value,1,500) AS new_preview, changed_by, ip, user_agent, created_at FROM audit_log ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error reading audit', error: err });
    return res.json({ success: true, data: results });
  });
});

  // Start server
  // Bind explicitly to 0.0.0.0 to make the server reachable from the host network
  const LISTEN_HOST = process.env.LISTEN_HOST || '0.0.0.0';
  app.listen(PORT, LISTEN_HOST, () => {
    console.log(`✅ Servidor backend ejecutándose en http://${LISTEN_HOST}:${PORT} (process.env.LISTEN_HOST=${process.env.LISTEN_HOST})`);
  });

  // Global handlers to log otherwise-silent errors (helps debug 500s)
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err && err.stack ? err.stack : err);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason && reason.stack ? reason.stack : reason);
  });

  module.exports = app;