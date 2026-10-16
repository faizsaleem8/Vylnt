import { createApp } from './app';
import { localAuth, supabaseAuth } from './auth';
import { FileStore, SupabaseStore } from './store';
import { readSupabaseConfig } from './config';
import { readRateLimits } from './rate-limits';
const port = Number(process.env.PORT ?? 4318);
const mode = process.env.VYNLT_STORAGE ?? 'local';
const host = process.env.HOST ?? '127.0.0.1';
if (!['local', 'supabase'].includes(mode)) throw new Error('VYNLT_STORAGE must be local or supabase');
if (mode === 'local' && host !== '127.0.0.1' && host !== 'localhost') throw new Error('Local token mode must bind to loopback');
const supabase = mode === 'supabase' ? readSupabaseConfig(process.env) : undefined;
const auth = supabase ? supabaseAuth(supabase.url, supabase.publishableKey) : localAuth(process.env.VYNLT_API_TOKEN ?? '');
const store = supabase ? new SupabaseStore(supabase.url, supabase.publishableKey) : new FileStore(process.env.VYNLT_DATA_FILE ?? '.local/scans.json');
const app = createApp({ auth, store, mode, supabase, rateLimits: readRateLimits(process.env), dashboardDir: 'dist/dashboard',
  origins: (process.env.VYNLT_ALLOWED_ORIGINS ?? `http://127.0.0.1:${port},http://localhost:${port},http://127.0.0.1:5173,http://localhost:5173`).split(',') });
const server = app.listen(port, host, () => console.log(`VYNLT dashboard and API: http://${host}:${port} (${mode} storage)`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(() => process.exit(0)));
