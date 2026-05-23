'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    const supabase = createClient();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }
      if (!data.session) {
        setStatus('error');
        setErrorMsg(
          'Account created, but email confirmation is required. Turn off "Confirm email" in Supabase → Authentication → Providers → Email for local dev.'
        );
        return;
      }
    }

    router.push('/');
    router.refresh();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMsg('');
    setStatus('idle');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="h-1 bg-enbridge-yellow" />
      <main className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm bg-white border border-black/10 rounded-lg p-8">
          <h1 className="text-xl font-semibold tracking-tight">NAEP Field Cost Tracker</h1>
          <p className="mt-1 text-sm text-enbridge-black/60">
            {mode === 'signin' ? 'Sign in to your account.' : 'Create an account.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
                placeholder="you@enbridge.com"
                autoFocus
                autoComplete="email"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              />
              {mode === 'signup' && (
                <p className="mt-1 text-xs text-enbridge-black/50">Minimum 8 characters.</p>
              )}
            </div>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="w-full rounded bg-enbridge-black text-white py-2 text-sm font-medium hover:bg-enbridge-black/90 disabled:opacity-60"
            >
              {status === 'submitting'
                ? mode === 'signin' ? 'Signing in…' : 'Creating account…'
                : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
            {status === 'error' && (
              <div className="text-sm text-red-700">{errorMsg}</div>
            )}
          </form>

          <div className="mt-6 text-sm text-center text-enbridge-black/60">
            {mode === 'signin' ? (
              <>
                No account yet?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-enbridge-black underline hover:no-underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="text-enbridge-black underline hover:no-underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
