# Provisioning Apex vendor users

Two external Apex Distribution contacts get scoped access to the Site PVF module
only (`/pvf`) — every other authed route redirects them back to `/pvf`, and
their sidebar is stripped down to that one link.

Approved emails (hardcoded in [lib/roles.ts](../../lib/roles.ts)):

- `jason.zaporosky@apexdistribution.com`
- `kurtis.favot@apexdistribution.com`

If either of these emails is registered in Supabase Auth, the app treats them
as `apex_vendor` automatically — no metadata editing needed.

---

## Option A — invite them (recommended)

1. Supabase dashboard → **Authentication → Users → Invite user**
2. Enter the email
3. They receive an email with a magic-link setup flow, choose a password
4. First login lands them on `/pvf`

## Option B — create with a known password (if invite email is inconvenient)

1. Supabase dashboard → **Authentication → Users → Add user → Create new user**
2. Enter email + a temp password, uncheck "Email confirmed" if you want to
   force them to confirm, or check it to skip confirmation
3. Send them the temp password out-of-band
4. First login lands them on `/pvf`

## Option C — self sign-up

The `/login` page has a sign-up mode, so they can also self-register with the
approved email. The role check keys off email, not who created the account.

---

## Verifying

After a vendor logs in:

- URL bar should sit at `/pvf`
- Sidebar shows only **Apex · Aitken Creek → Site PVF** (no Dashboard, Vendors,
  Schedule, etc.)
- Typing `/tickets` (or any other authed path) in the URL bar → bounces back
  to `/pvf`
- Direct `fetch('/api/tickets')` calls → HTTP 403 JSON

## Removing access

Two ways, either works:

- Delete the user in Supabase → **Authentication → Users**
- Remove the email from `APEX_VENDOR_EMAILS` in [lib/roles.ts](../../lib/roles.ts),
  commit, push — they'll silently drop back to `internal` role. That's the
  wrong direction for revocation (they'd suddenly see everything), so **prefer
  deleting the user** for offboarding.

## Adding more vendor accounts later

Add the email to `APEX_VENDOR_EMAILS` in [lib/roles.ts](../../lib/roles.ts),
commit, push, then invite/create the user in Supabase. Order doesn't matter —
the check runs on every request.
