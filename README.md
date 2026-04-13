# StoreWatch

StoreWatch is a mobile-first inventory and sales tracker for small shops. It combines packaging-tier pricing, stock receipts with cost, profit visibility, employee activity logs, and offline-first data capture in one Progressive Web App.

## Highlights

- Owner and Employee role-based workflows
- Multi-item sales recording
- Product packaging tiers (for example, crate, bottle, single)
- Cost-aware stock intake and gross profit estimates
- Owner dashboard, inventory search, and sales history
- Employee daily log with packaging labels for clear audit trails
- Offline-first writes with local queue and background sync
- Light and dark themes optimized for mobile readability

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS
- Supabase (Auth, Postgres, Realtime)
- Dexie (IndexedDB) for offline queue/cache
- vite-plugin-pwa

## Quick Start

1. Install dependencies.

```bash
npm install
```

2. Create your environment file.

```bash
cp .env.example .env
```

3. Set values in `.env`.

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. Apply database schema in Supabase SQL Editor.

- `supabase/schema.sql`
- If needed for older data model upgrades: `supabase/migration_packaging_model.sql`

5. Start development server.

```bash
npm run dev
```

App runs at http://localhost:5173

## User Setup

### Owner account

1. Create an email/password user in Supabase Auth.
2. Insert the same auth UUID into `public.users` as role `owner`.

```sql
insert into public.users (id, name, role)
values ('<auth-user-uuid>', 'Owner Name', 'owner');
```

### Employee account (PIN login)

1. Generate a bcrypt hash for the employee PIN.
2. Insert into `public.users` with role `employee`.

```sql
insert into public.users (id, name, role, pin)
values (gen_random_uuid(), 'Employee Name', 'employee', '$2a$10$replace_with_bcrypt_hash');
```

## Scripts

- `npm run dev` - start local development
- `npm run build` - type-check and build production bundle
- `npm run preview` - preview production build locally

## Deployment (Vercel)

1. Push this repo to GitHub.
2. In Vercel, click New Project and import the GitHub repository.
3. Set environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

4. Build settings:

- Build Command: `npm run build`
- Output Directory: `dist`

Vercel will redeploy automatically on each push to `main`.

## Notes

- The app is PWA-enabled and installable.
- Offline writes are queued locally and synced when connectivity returns.
- In development, service worker behavior is disabled to avoid stale UI artifacts.
