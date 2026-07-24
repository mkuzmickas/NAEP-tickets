import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/Sidebar';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar userEmail={user.email ?? ''} />
      <main className="flex-1 min-h-0 min-w-0 w-full overflow-hidden">
        {children}
      </main>
    </div>
  );
}
