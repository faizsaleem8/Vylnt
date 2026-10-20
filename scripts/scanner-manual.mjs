import http from 'node:http';

// Two loopback origins: .1 is already granted; .2 exercises the optional site prompt.
const servers = [];
for (const host of ['127.0.0.1', '127.0.0.2']) {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('<!doctype html><meta charset="utf-8"><title>VYNLT M1 local acceptance</title><h1>VYNLT local scanner check</h1><p>Controlled loopback fixture. No account, credentials or external resources.</p><p>Use the VYNLT toolbar button to open the native side panel. This deliberately has missing configuration headers; findings are warnings, not proof of exploitation.</p>');
  });
  server.on('error', error => { console.error(error.message); process.exitCode = 1; for (const running of servers) running.close(); });
  await new Promise((r, reject) => { server.once('error', reject); server.listen(5175, host, r); }); servers.push(server);
}
console.log('VYNLT M1 native panel fixture: http://127.0.0.1:5175/');
console.log('VYNLT M1 optional-permission fixture: http://127.0.0.2:5175/');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { for (const server of servers) { server.closeAllConnections(); server.close(); } });
