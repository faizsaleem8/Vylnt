import http from 'node:http';
import https from 'node:https';
import { existsSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function handler(req, res) {
  const path = new URL(req.url, 'http://127.0.0.1:5174').pathname;
  const tls = Boolean(req.socket.encrypted);
  if (path === '/redirect') { res.writeHead(302, { Location: '/secure' }); res.end(); return; }
  if (path === '/app.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    res.end("document.querySelector('#dynamic')?.addEventListener('click',()=>{const img=document.createElement('img');img.src='http://127.0.0.1:5174/pixel.svg?secret=redact';document.body.append(img);document.querySelector('#result').textContent='Dynamic HTTP image added.';},{once:true});document.querySelector('#route')?.addEventListener('click',()=>{history.pushState({},'', '/dynamic/next?token=private');document.querySelector('#result').textContent='SPA route changed.';});"); return;
  }
  if (path === '/pixel.svg') { res.writeHead(200, { 'Content-Type': 'image/svg+xml' }); res.end('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="4"><rect width="4" height="4" fill="green"/></svg>'); return; }
  const secure = path === '/secure';
  const headers = { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' };
  if (secure) {
    headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'none'";
    headers['X-Frame-Options'] = 'DENY';
    headers['Set-Cookie'] = 'vynlt_session=lab-only; HttpOnly; Secure; SameSite=Strict; Path=/secure';
    if (tls) headers['Strict-Transport-Security'] = 'max-age=31536000';
  } else headers['Set-Cookie'] = 'vynlt_session=lab-only; SameSite=Lax; Path=/insecure';
  res.writeHead(200, headers);
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>VYNLT ${secure ? 'hardened' : 'insecure'} lab</title><body><h1>VYNLT controlled lab</h1><p>${secure ? 'Restrictive response policies and protected cookie attributes.' : 'Deliberately missing response policies and weak session cookie attributes.'}</p><p>${tls ? 'HTTPS fixture: HSTS and HTTP resource checks apply.' : 'HTTP fixture: use the HTTPS lab for HSTS and mixed-content checks.'}</p><nav><a href="/secure">Hardened page</a> · <a href="/insecure">Insecure page</a> · <a href="/dynamic">Dynamic page</a></nav><p>Install the extension, open its popup, and select Rescan page.</p><button id="dynamic">Add dynamic image</button><button id="route">Change SPA route</button><p id="result"></p><script src="/app.js"></script>${tls && !secure ? '<img alt="Local mixed-resource fixture" src="http://127.0.0.1:5174/pixel.svg?token=private">' : ''}</body></html>`);
}
export async function startLabs() {
  const servers = [http.createServer(handler)];
  await new Promise((resolve, reject) => { servers[0].once('error', reject); servers[0].listen(5174, '127.0.0.1', resolve); });
  try {
    if (existsSync('.local/tls/key.pem') && existsSync('.local/tls/cert.pem')) {
      const tlsServer = https.createServer({ key: readFileSync('.local/tls/key.pem'), cert: readFileSync('.local/tls/cert.pem') }, handler);
      servers.push(tlsServer);
      await new Promise((resolve, reject) => { tlsServer.once('error', reject); tlsServer.listen(5443, '127.0.0.1', resolve); });
    }
    return servers;
  } catch (error) { for (const server of servers) server.close(); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const servers = await startLabs();
  console.log('VYNLT HTTP lab: http://127.0.0.1:5174/insecure');
  if (servers.length > 1) console.log('VYNLT HTTPS lab: https://127.0.0.1:5443/insecure');
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { for (const server of servers) server.close(); });
}
