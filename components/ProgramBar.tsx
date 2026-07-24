'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function ProgramBar({ userEmail }: { userEmail: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="print:hidden shrink-0 flex items-center justify-between gap-4 bg-[var(--surface)] border-b border-[var(--border)] px-6 py-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-[var(--text)]">
          Aitken Creek Expansion Project
        </div>
        <div className="truncate text-xs text-[var(--text-muted)]">
          Enbridge Gas Inc. · d-44-L / 94-A-13 Aitken Creek · Project 30006386
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-medium">
            Project #
          </div>
          <div className="text-xs font-medium tabular text-[var(--text)]">
            30006386
          </div>
        </div>
        <div className="border-l border-[var(--border)] pl-4 text-right">
          <div className="max-w-[16rem] truncate text-xs font-medium text-[var(--text)]">
            {userEmail}
          </div>
          <button
            onClick={signOut}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--over)] hover:underline"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
