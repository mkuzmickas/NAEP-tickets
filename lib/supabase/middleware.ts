import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getUserRole, isPathAllowedForRole } from '@/lib/roles';

// Paths that never trigger a role check, even for authenticated users.
// Auth flows and the login screen must stay reachable.
const PUBLIC_PATH_PREFIXES = ['/login', '/auth'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Role-based path gating: apex_vendor users may only touch /pvf* and
  // /api/apex*. Everything else redirects to /pvf (or 403s for API calls,
  // since a fetch following a redirect to /pvf makes no sense).
  if (user && !isPublicPath(request.nextUrl.pathname)) {
    const role = getUserRole(user);
    if (!isPathAllowedForRole(role, request.nextUrl.pathname)) {
      if (request.nextUrl.pathname.startsWith('/api/')) {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden — role not permitted on this endpoint' }),
          { status: 403, headers: { 'content-type': 'application/json' } }
        );
      }
      const url = request.nextUrl.clone();
      url.pathname = '/pvf';
      url.search = '';
      return NextResponse.redirect(url);
    }
  }

  return response;
}
