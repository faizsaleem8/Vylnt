import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('.build', { recursive: true });
const result = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-keyout', '.build/key.pem', '-out', '.build/cert.pem', '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1'], { stdio: 'ignore', env: { ...process.env, MSYS_NO_PATHCONV: '1' }, windowsHide: true });
if (result.status !== 0) throw new Error('OpenSSL is required for this localhost HTTPS demo');
