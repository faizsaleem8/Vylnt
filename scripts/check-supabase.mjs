// Read-only checks. No accounts, sessions, rows or messages are created.
const url = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url.startsWith('https://') || !key) throw new Error('Missing Supabase project URL/public key.');
const settings = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
if (!settings.ok) throw new Error(`Supabase Auth settings rejected the public key (${settings.status}).`);
const config = await settings.json();
console.log(JSON.stringify({ authReachable: true, emailProviderEnabled: config.external?.email, signupDisabled: config.disable_signup, emailConfirmationRequired: config.mailer_autoconfirm === false }));
for (const table of ['sites', 'scans', 'findings', 'feedback']) {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=0`, { headers: { apikey: key }, signal: AbortSignal.timeout(15000) });
  const body = await response.json().catch(() => ({}));
  if (![401, 403].includes(response.status) || body.code !== '42501') throw new Error(`Unexpected anonymous access result for ${table}: HTTP ${response.status}, code ${body.code ?? 'none'}.`);
  console.log(`${table}: anonymous access denied by database permissions`);
}
console.log('Read-only service/public-key checks passed. Authenticated CRUD and two-user RLS remain to be verified after sign-in.');
