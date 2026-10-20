import { createMemoryClient } from '../../packages/auth/client';

const status = document.querySelector<HTMLElement>('#status')!;
const output = document.querySelector<HTMLElement>('#results')!;
const clients = new Map<string, ReturnType<typeof createMemoryClient>>();
const connected = new Set<string>();
async function json(path: string, value?: unknown) {
  const response = await fetch(path, { ...(value === undefined ? {} : { method: 'POST', body: JSON.stringify(value) }), headers: { 'Content-Type': 'application/json' } });
  const result = await response.json(); if (!response.ok) throw new Error(result.error ?? 'Check unavailable'); return result;
}
for (const form of document.querySelectorAll<HTMLFormElement>('form')) form.addEventListener('submit', async event => {
  event.preventDefault(); const slot = form.dataset.slot!;
  const submit = form.querySelector<HTMLButtonElement>('button')!; submit.disabled = true; status.textContent = 'Signing in privately…';
  const password = form.elements.namedItem('password') as HTMLInputElement;
  try {
    const config = await json('/acceptance/config');
    const client = clients.get(slot) ?? createMemoryClient(config); clients.set(slot, client);
    const result = await client.auth.signInWithPassword({ email: (form.elements.namedItem('email') as HTMLInputElement).value, password: password.value });
    password.value = '';
    if (result.error || !result.data.session) throw new Error('Sign-in failed. Check the credentials and email confirmation in Supabase.');
    await json('/acceptance/session', { slot, token: result.data.session.access_token });
    connected.add(slot); status.textContent = `Account ${slot} connected in memory. ${connected.has('B') ? 'Ready for the two-account check.' : 'You can run single-account checks now; account B is optional and needed for isolation verification.'}`;
    (document.querySelector('#run') as HTMLButtonElement).disabled = !connected.has('A');
  } catch (error) { status.textContent = error instanceof Error ? error.message : 'Sign-in failed'; }
  finally { password.value = ''; submit.disabled = false; }
});
document.querySelector('#run')!.addEventListener('click', async () => {
  const forms = [...document.querySelectorAll<HTMLFieldSetElement>('fieldset')]; forms.forEach(field => { field.disabled = true; });
  status.textContent = 'Running bounded live checks and cleaning up the two synthetic scan records…';
  try { const results = await json('/acceptance/run', {}); output.textContent = JSON.stringify(results, null, 2); status.textContent = results.failure || results.cleanupFailures.length ? 'Check failed or cleanup needs attention. Review the results.' : results.skipped.length ? 'Available checks passed. Skipped items remain unverified.' : 'All hosted checks passed.'; }
  catch (error) { status.textContent = error instanceof Error ? error.message : 'Check unavailable'; }
  finally { for (const client of clients.values()) await client.auth.dispose(); clients.clear(); connected.clear(); forms.forEach(field => { field.disabled = false; }); (document.querySelector('#run') as HTMLButtonElement).disabled = true; }
});
