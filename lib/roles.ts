import type { User } from '@supabase/supabase-js';

/**
 * Roles the app recognises. Anything not matching apex_vendor falls back to
 * internal.
 *
 *   internal    — full access to every page and API (Mike, project team)
 *   apex_vendor — only sees the Site PVF module; every other authed route
 *                 redirects to /pvf. Meant for Apex Distribution contacts.
 */
export type UserRole = 'internal' | 'apex_vendor';

/**
 * Hard allow-list of emails that get apex_vendor role automatically, no
 * user_metadata editing needed. Keep this list tight — anyone here has read
 * + write access to every apex_line_items row (they can tag ship dates).
 *
 * Not restricted by domain — Sureline personnel are on the same allow-list
 * because they coordinate the same shipments.
 */
const APEX_VENDOR_EMAILS: ReadonlySet<string> = new Set([
  'jason.zaporosky@apexdistribution.com',
  'kurtis.favot@apexdistribution.com',
  'mmaybin@surelineprojects.ca',
]);

function normalizeEmail(email: string | undefined | null): string {
  return (email ?? '').trim().toLowerCase();
}

export function getUserRole(user: Pick<User, 'email' | 'user_metadata'> | null | undefined): UserRole {
  // Email allow-list wins — safer than trusting user_metadata (which the user
  // could in theory influence via signUp options).
  if (APEX_VENDOR_EMAILS.has(normalizeEmail(user?.email))) return 'apex_vendor';
  if (user?.user_metadata?.role === 'apex_vendor') return 'apex_vendor';
  return 'internal';
}

/**
 * Prefixes an apex_vendor user is allowed to reach. Any authed path outside
 * this list redirects to /pvf. Public paths (/login, /auth/*) are handled
 * separately and don't need to be listed here.
 */
const APEX_VENDOR_ALLOWED_PREFIXES = ['/pvf', '/api/apex'];

export function isPathAllowedForRole(role: UserRole, pathname: string): boolean {
  if (role === 'internal') return true;
  if (role === 'apex_vendor') {
    return APEX_VENDOR_ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
    );
  }
  return false;
}

/** Where each role should land when they hit the app root. */
export function homePathForRole(role: UserRole): string {
  if (role === 'apex_vendor') return '/pvf';
  return '/';
}
