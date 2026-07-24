import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';
import { ProgramBar } from '@/components/ProgramBar';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--page-bg)]">
      <Sidebar />
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        <ProgramBar userEmail={user.email ?? ''} />
        <main className="flex-1 min-h-0 min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
