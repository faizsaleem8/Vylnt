import https from 'node:https';
import { readFileSync } from 'node:fs';
const { mode } = JSON.parse(readFileSync(new URL('./security.json', import.meta.url)));
if (!['secure', 'insecure'].includes(mode)) throw new Error('Unsupported demo mode');
const server = https.createServer({ key: readFileSync('.build/key.pem'), cert: readFileSync('.build/cert.pem') }, (req, res) => {
  if (!['/', '/account'].includes(req.url)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': 'text/html', 'Strict-Transport-Security': 'max-age=31536000', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'none'; script-src 'self'; frame-ancestors 'none'" });
  // Deliberately referenced, not executed. NET-001 must retain its configuration-warning meaning.
  res.end(`<!doctype html><html lang="en"><title>VYLNT gate demo</title><h1>Local security gate demo</h1>${mode === 'insecure' ? '<script src="http://127.0.0.1:1/insecure-script.js"></script>' : ''}</html>`);
});
server.listen(Number(process.env.PORT), '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
