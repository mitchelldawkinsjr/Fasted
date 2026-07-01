# Security Rules

## Authentication and authorization

- Supabase Auth for sign-in (`src/hooks/useAuth.ts`, `CloudSyncSection.tsx`)
- RLS policies on all Supabase tables — verify migrations include appropriate policies
- `RequireAuth.tsx` for routes requiring sign-in
- Never trust client-side checks alone for group-scoped data — RLS must enforce

## Secrets and environment

- **Never commit:** `.env`, `.pem`, `.key`, production credentials
- Use `VITE_*` prefix only for public anon keys (Supabase anon key is designed for client exposure)
- CI uses placeholder Supabase URLs for Docker builds
- `.github/workflows/security.yml` scans for tracked secrets and runs `npm audit`

## Input validation

- Sanitize user text before display (React escapes by default; avoid `dangerouslySetInnerHTML`)
- Validate JSON import in Settings backup flow
- Supabase RPC calls: validate inputs client-side; enforce constraints server-side

## API and data

- No custom server routes — all API via Supabase client
- Progress data stored as JSON blob — validate shape on read/write in storage layer
- Group features: check membership before showing group content

## Security Agent scope

Read-only review of PR diff for:

- Hardcoded secrets or tokens
- Missing auth gates on new protected features
- RLS policy gaps in new migrations
- Unsafe HTML injection
- Exposed service role keys (must never appear in client code)
