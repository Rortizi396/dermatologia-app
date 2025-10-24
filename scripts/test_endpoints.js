const axios = require('axios');

const BASE = process.env.BASE_URL || process.argv[2];
if (!BASE) {
  console.error('Usage: node test_endpoints.js <BASE_URL>  OR set BASE_URL env var');
  process.exit(2);
}

const client = axios.create({ baseURL: BASE, timeout: 15000 });

async function run() {
  console.log('Base URL:', BASE);

  // 1) health
  try {
    const r = await client.get('/api/health');
    console.log('\n[OK] GET /api/health ->', r.status, r.data);
  } catch (e) {
    console.error('\n[FAIL] GET /api/health ->', errMsg(e));
    process.exitCode = 1;
  }

  // 2) list users
  try {
    const r = await client.get('/api/users');
    console.log('\n[OK] GET /api/users ->', r.status, (Array.isArray(r.data.data) ? `received ${r.data.data.length} users` : JSON.stringify(r.data).slice(0,200)));
  } catch (e) {
    console.error('\n[FAIL] GET /api/users ->', errMsg(e));
    process.exitCode = 1;
  }

  // 3) try login with seeded admin
  try {
    const r = await client.post('/api/auth/login', { email: 'carlos@ejemplo.com', password: 'admin123' });
    console.log('\n[OK] POST /api/auth/login ->', r.status, Object.keys(r.data || {}).join(', '));
    if (r.data && r.data.data && r.data.data.token) console.log('  token sample:', (r.data.data.token||'').slice(0,40)+'...');
  } catch (e) {
    console.error('\n[WARN] POST /api/auth/login ->', errMsg(e), '\n  (seed login may be absent in production)');
  }

  // 4) create a test secretaria
  const rnd = Math.floor(Math.random()*100000);
  const testEmail = `testuser_${rnd}@example.com`;
  try {
    const r = await client.post('/api/users', {
      nombres: 'Test',
      apellidos: 'User',
      correo: testEmail,
      password: 'Test1234!',
      tipo: 'secretaria',
      activo: true
    });
    console.log('\n[OK] POST /api/users ->', r.status, r.data);
  } catch (e) {
    console.error('\n[FAIL] POST /api/users ->', errMsg(e));
    process.exitCode = 1;
  }

  console.log('\nFinished. Exit code:', process.exitCode || 0);
}

function errMsg(e) {
  if (!e) return String(e);
  if (e.response) return `${e.response.status} - ${JSON.stringify(e.response.data)}`;
  if (e.request) return `no-response - ${e.message}`;
  return `error - ${e.message}`;
}

run().catch(e => { console.error('Uncaught error', e); process.exit(1); });
