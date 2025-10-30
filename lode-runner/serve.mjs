import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[2] ?? __dirname);
const sharedRoot = path.resolve(__dirname, '../shared');
const port = Number(process.env.PORT || 5173);

const aliasRoots = [
  { prefix: '/shared/', base: sharedRoot },
];

const types = new Map([
  ['.html','text/html; charset=utf-8'],
  ['.htm','text/html; charset=utf-8'],
  ['.js','application/javascript; charset=utf-8'],
  ['.mjs','application/javascript; charset=utf-8'],
  ['.css','text/css; charset=utf-8'],
  ['.json','application/json; charset=utf-8'],
  ['.txt','text/plain; charset=utf-8'],
  ['.png','image/png'],
  ['.jpg','image/jpeg'],
  ['.jpeg','image/jpeg'],
  ['.svg','image/svg+xml; charset=utf-8'],
  ['.wasm','application/wasm'],
  ['.map','application/json; charset=utf-8'],
]);

function safeJoin(base, target) {
  const p = path.normalize(path.join(base, target));
  if (!p.startsWith(base)) throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' });
  return p;
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', 'http://localhost');
    let pathname = decodeURIComponent(reqUrl.pathname);
    let base = root;
    for (const { prefix, base: aliasBase } of aliasRoots) {
      if (pathname.startsWith(prefix)) {
        pathname = pathname.slice(prefix.length);
        base = aliasBase;
        break;
      }
    }
    if (pathname === '') pathname = '/';
    if (pathname.endsWith('/')) pathname += 'index.html';
    if (pathname.startsWith('/')) pathname = pathname.slice(1);

    let filePath = safeJoin(base, pathname);

    let st;
    try { st = await stat(filePath); } catch (_) {}

    if (!st || st.isDirectory()) {
      if (base !== root) {
        throw Object.assign(new Error('Not Found'), { code: 'NOT_FOUND' });
      }
      // Fallback to index.html for directories or missing files under the main root
      filePath = safeJoin(root, 'index.html');
    }

    const data = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const type = types.get(ext) || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(data);
  } catch (err) {
    const code = err && err.code === 'FORBIDDEN' ? 403 : 404;
    res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`${code} ${err?.message || 'Not Found'}`);
  }
});

server.listen(port, () => {
  console.log(`Serving ${root} at http://localhost:${port}`);
});
