import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export function SupabaseLogin({ client, onSignedIn }: { client: SupabaseClient; onSignedIn: (token: string) => Promise<void> }) {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false); const [pending, setPending] = useState(false);
  const [message, setMessage] = useState(''); const [error, setError] = useState('');
  return <section className="connect-card"><div className="connect-symbol"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Zm-4 9 3 3 5-6" /></svg></div><div className="auth-content"><h2>{register ? 'Create your VYNLT account' : 'Sign in to VYNLT'}</h2><p className="muted">Use the same account as your VYNLT side panel to review automatically saved scans here. Keep the panel open and signed in while scanning.</p>
    {error && <div className="alert error" role="alert">{error}</div>}{message && <div className="alert success" role="status">{message}</div>}
    <form onSubmit={e => { e.preventDefault(); setPending(true); setError(''); setMessage(''); const enteredPassword = password; setPassword(''); void (async () => {
      const result = register
        ? await client.auth.signUp({ email: email.trim(), password: enteredPassword, options: { emailRedirectTo: window.location.origin } })
        : await client.auth.signInWithPassword({ email: email.trim(), password: enteredPassword });
      if (result.error) throw result.error;
      if (result.data.session) await onSignedIn(result.data.session.access_token);
      else { setMessage('Check your email to confirm your account, then return here and sign in.'); setRegister(false); }
    })().catch(e => setError(e instanceof Error ? e.message : 'Sign-in failed. Please try again.')).finally(() => setPending(false)); }}>
      <label htmlFor="email">Email address</label><input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="username" required disabled={pending} />
      <label htmlFor="password">Password</label><input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} required disabled={pending} />
      <button className="primary" disabled={pending}>{pending ? 'Connecting…' : register ? 'Create account' : 'Sign in'}</button>
    </form><button className="text-button auth-switch" disabled={pending} onClick={() => { setRegister(!register); setPassword(''); setError(''); setMessage(''); }}>{register ? 'Already have an account? Sign in' : 'New to VYNLT? Create an account'}</button>
    <p className="small muted">Closing or reloading this tab signs you out locally. Passwords and session tokens are not saved by VYNLT.</p></div></section>;
}
