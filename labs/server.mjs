import http from 'node:http';

const server = http.createServer((req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1:5174').pathname;
  if (path === '/app.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end("document.querySelector('#dynamic')?.addEventListener('click',()=>{const script=document.createElement('script');script.src='/app.js?dynamic=1';document.body.append(script);document.querySelector('#result').textContent='A script element was added. Reopen the report to inspect updated DOM coverage.';});"); return;
  }
  const secure = path === '/secure';
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };
  if (secure) {
    headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'";
    headers['X-Frame-Options'] = 'DENY';
    headers['Set-Cookie'] = 'vynlt_session=lab-only; HttpOnly; Secure; SameSite=Strict; Path=/secure';
  } else headers['Set-Cookie'] = 'vynlt_session=lab-only; SameSite=Lax; Path=/insecure';
  res.writeHead(200, headers);
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>VYNLT ${secure ? 'hardened' : 'insecure'} HTTP lab</title><body><h1>VYNLT controlled lab</h1><p>${secure ? 'Restrictive response policies and protected cookie attributes.' : 'Deliberately missing response policies and weak session cookie attributes.'}</p><p>This HTTP fixture does not test HSTS or mixed content. HTTPS scenarios are covered by rule fixtures until a TLS lab is configured.</p><nav><a href="/secure">Hardened HTTP page</a> · <a href="/insecure">Insecure page</a> · <a href="/dynamic">Dynamic page</a></nav><p>Install the extension, open its popup, and select Rescan page.</p><button id="dynamic">Add dynamic script</button><p id="result"></p><script src="/app.js"></script></body></html>`);
});
server.listen(5174, '127.0.0.1', () => console.log('VYNLT lab: http://127.0.0.1:5174/insecure'));
