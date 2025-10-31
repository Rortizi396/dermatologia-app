// Simple script to inject API URL into built index.html
const fs = require('fs');
const path = require('path');
// Very small arg parser to avoid extra dependencies
const argv = process.argv.slice(2);
const args = {};
argv.forEach(a => {
  const m = a.match(/^--([^=]+)=(.*)$/);
  if (m) args[m[1]] = m[2];
});
const dist = args.dist || args.d || 'dist';
let apiUrl = args.apiUrl || args.apiurl || args.api || '';
if (!apiUrl) {
  console.error('Usage: node write-env.js --dist=dist-folder --apiUrl=https://...');
  process.exit(1);
}

const indexPath = path.resolve(process.cwd(), dist, 'index.html');
if (!fs.existsSync(indexPath)) {
  console.error('index.html not found in', indexPath);
  process.exit(1);
}

// Ensure the configured API URL ends with '/api' so client code points
// to backend routes mounted under /api. If the user supplied a URL
// without the suffix, append it (but avoid double slashes).
if (!/\/api\/?$/i.test(apiUrl)) {
  apiUrl = apiUrl.replace(/\/+$/, '') + '/api';
}

let html = fs.readFileSync(indexPath, 'utf8');
// Replace any line that assigns window.__env.apiUrl (be permissive about whitespace/quotes)
html = html.replace(/window\.__env\s*\.\s*apiUrl\s*=\s*window\.__env\s*\.\s*apiUrl\s*\|\|\s*(['"]).*?\1\s*;?/m, `window.__env.apiUrl = window.__env.apiUrl || '${apiUrl}';`);
fs.writeFileSync(indexPath, html, 'utf8');
console.log('Wrote API URL into', indexPath);

// For GitHub Pages SPA support: copy index.html to 404.html so deep links
// like /dermatologia-app/dashboard load the app instead of a hard 404 page.
// GitHub Pages serves 404.html for unknown paths.
try {
  const notFoundPath = path.resolve(process.cwd(), dist, '404.html');
  fs.writeFileSync(notFoundPath, html, 'utf8');
  console.log('Created SPA fallback', notFoundPath);
} catch (e) {
  console.warn('Could not create 404.html fallback:', e.message);
}

// Ensure GitHub Pages does not run Jekyll on the docs folder
try {
  const nojekyllPath = path.resolve(process.cwd(), dist, '.nojekyll');
  if (!fs.existsSync(nojekyllPath)) {
    fs.writeFileSync(nojekyllPath, '', 'utf8');
    console.log('Created', nojekyllPath);
  }
} catch (e) {
  console.warn('Could not create .nojekyll file:', e.message);
}
