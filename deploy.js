const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const TOKEN = process.env.VERCEL_TOKEN || process.argv[2];
if (!TOKEN) { console.error('Need VERCEL_TOKEN'); process.exit(1); }

const PROJECT_ID = 'prj_T3h8EBpJmVldCG5J0QNjcPkkZzad';

function walkDir(dir, base = '') {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relPath = base ? `${base}/${item.name}` : item.name;
    if (item.isDirectory()) {
      results.push(...walkDir(fullPath, relPath));
    } else {
      if (item.name === 'gen-articles.js' || item.name === '.gitignore') continue;
      results.push({ file: relPath, content: fs.readFileSync(fullPath, 'utf-8') });
    }
  }
  return results;
}

const files = walkDir('.');
console.log(`Uploading ${files.length} files to Vercel...`);

const body = JSON.stringify({
  name: 'ai-tools-box',
  projectSettings: { framework: null },
  files: files.map(f => ({ file: f.file, data: f.content }))
});

const req = https.request({
  hostname: 'api.vercel.com',
  port: 443,
  path: '/v13/deployments',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TOKEN}`,
    'Content-Length': Buffer.byteLength(body)
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const resp = JSON.parse(data);
    if (resp.id) {
      console.log(`Deployment created: ${resp.id}`);
      console.log(`URL: ${resp.url}`);
      console.log(`Ready: ${resp.readyState}`);
    } else {
      console.error('Error:', JSON.stringify(resp, null, 2));
    }
  });
});

req.on('error', (e) => { console.error('Request error:', e.message); });
req.write(body);
req.end();
