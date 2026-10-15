import { createApp } from './app';
import { localAuth, supabaseAuth } from './auth';
import { FileStore, SupabaseStore } from './store';
const port = Number(process.env.PORT ?? 4318);
const mode = process.env.VYNLT_STORAGE ?? 'local';
const host = process.env.HOST ?? '127.0.0.1';
if (!['local', 'supabase'].includes(mode)) throw new Error('VYNLT_STORAGE must be local or supabase');
if (mode === 'local' && host !== '127.0.0.1' && host !== 'localhost') throw new Error('Local token mode must bind to loopback');
const url = process.env.SUPABASE_URL ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';
if (mode === 'supabase' && (!url.startsWith('https://') || !anonKey)) throw new Error('Supabase mode requires HTTPS SUPABASE_URL and SUPABASE_ANON_KEY');
const auth = mode === 'local' ? localAuth(process.env.VYNLT_API_TOKEN ?? '') : supabaseAuth(url, anonKey);
const store = mode === 'local' ? new FileStore(process.env.VYNLT_DATA_FILE ?? '.local/scans.json') : new SupabaseStore(url, anonKey);
const app = createApp({ auth, store, mode, dashboardDir: 'dist/dashboard',
  origins: (process.env.VYNLT_ALLOWED_ORIGINS ?? `http://127.0.0.1:${port},http://localhost:${port},http://127.0.0.1:5173,http://localhost:5173`).split(',') });
const server = app.listen(port, host, () => console.log(`VYNLT dashboard and API: http://${host}:${port} (${mode} storage)`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => process.exit(0)));
