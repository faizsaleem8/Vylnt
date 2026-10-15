import { mkdir, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('.local/tls', { recursive: true });
try { await access('.local/tls/cert.pem'); await access('.local/tls/key.pem'); console.log('Local TLS fixture files already exist.'); }
catch {
  const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '30', '-keyout', '.local/tls/key.pem', '-out', '.local/tls/cert.pem', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'pipe', env: { ...process.env, MSYS_NO_PATHCONV: '1' } });
  if (result.status !== 0) throw new Error(`OpenSSL could not generate the local fixture certificate: ${result.error?.message ?? result.stderr?.toString()}`);
  console.log('Created self-signed localhost certificate in .local/tls. This is a test fixture; no certificate was added to your trust store.');
}
