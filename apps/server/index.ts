import { createApp } from './app';
import { localAuth, supabaseAuth } from './auth';
import { FileStore, SupabaseStore } from './store';
import { readSupabaseConfig, readDeploymentConfig } from './config';
import { readRateLimits } from './rate-limits';
import { openRateBackend, readRateBackendConfig } from './shared-rate-limits';
import { AnchorService } from './anchor';
const port = Number(process.env.PORT ?? 4318);
const mode = process.env.VYNLT_STORAGE ?? 'local';
const host = process.env.HOST ?? '127.0.0.1';
if (!['local', 'supabase'].includes(mode)) throw new Error('VYNLT_STORAGE must be local or supabase');
if (mode === 'local' && host !== '127.0.0.1' && host !== 'localhost') throw new Error('Local token mode must bind to loopback');
const supabase = mode === 'supabase' ? readSupabaseConfig(process.env) : undefined;
const auth = supabase ? supabaseAuth(supabase.url, supabase.publishableKey) : localAuth(process.env.VYNLT_API_TOKEN ?? '');
const store = supabase ? new SupabaseStore(supabase.url, supabase.publishableKey) : new FileStore(process.env.VYNLT_DATA_FILE ?? '.local/scans.json');
const deployment = readDeploymentConfig(process.env, port);
const rateLimits = readRateLimits(process.env);
const shared = await openRateBackend(readRateBackendConfig(process.env), rateLimits.windowMs);
if (process.env.VYNLT_BLOCKCHAIN && !['off', 'local'].includes(process.env.VYNLT_BLOCKCHAIN)) throw new Error('VYNLT_BLOCKCHAIN must be off or local');
let anchors: AnchorService | undefined, anchorWarning: string | undefined;
if (process.env.VYNLT_BLOCKCHAIN === 'local') {
  try { anchors = await AnchorService.open(); }
  catch { anchorWarning = 'Local blockchain setup is unavailable. Run chain:compile and chain:deploy, then restart the API.'; console.error(anchorWarning); }
}
const app = createApp({ auth, store, mode, supabase, rateLimits, anchors, anchorWarning, rateBackend: shared.backend, ...deployment, dashboardDir: 'dist/dashboard' });
const server = app.listen(port, host, () => console.log(`VYNLT dashboard and API: http://${host}:${port} (${mode} storage)`));
server.on('error', () => { shared.close(); void anchors?.close(); });
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.on(signal, () => server.close(async () => { shared.close(); await anchors?.close(); process.exit(0); }));
