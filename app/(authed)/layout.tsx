import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/TopBar';

export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="h-1 bg-enbridge-yellow shrink-0" />
      <TopBar userEmail={user.email ?? ''} />
      <main className="flex-1 min-h-0 w-full">
        {children}
      </main>
    </div>
  );
}
