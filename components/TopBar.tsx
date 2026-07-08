'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export function TopBar({ userEmail }: { userEmail: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-black/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight text-enbridge-black">
            Aitken Creek Expansion
            <span className="text-enbridge-black/50 font-normal"> — Field Cost Tracker</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-enbridge-black/70">
            <Link href="/" className="hover:text-enbridge-black">Dashboard</Link>
            <Link href="/tickets" className="hover:text-enbridge-black">Logged Tickets</Link>
            <Link href="/upload" className="hover:text-enbridge-black">Upload</Link>
            <Link href="/admin/pos" className="hover:text-enbridge-black">POs</Link>
            <Link href="/schedule" className="hover:text-enbridge-black">Ship Schedule</Link>
            <Link href="/ewp-schedule" className="hover:text-enbridge-black">EWP Schedule</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-enbridge-black/70">
          <span>{userEmail}</span>
          <button
            onClick={signOut}
            className="px-3 py-1 rounded border border-black/10 hover:bg-enbridge-paper"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
