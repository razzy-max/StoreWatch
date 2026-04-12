# StoreWatch

StoreWatch is a mobile-first Progressive Web App for a drinks and wine retail store. It supports wholesale and retail sales with sophisticated inventory tracking. It supports two roles:

- Owner: dashboard, inventory control, sales history, and product management
- Employee: PIN login, offline-first sales capture, stock intake, and a personal daily log

The frontend is built with React, Vite, TypeScript, Tailwind CSS, React Router, Dexie, Supabase JS, Lucide React, and vite-plugin-pwa. The app is installable on Android and iOS home screens and can continue working offline for employee actions.

## Features

- Mobile-first layout tuned for small screens
- Wholesale + Retail packaging model with separate pricing tiers
- Base-unit stock canonicalization for accurate inventory math
- Owner and employee role flows
- Supabase Auth for owner login
- PIN-based employee login
- Offline-first sales and stock updates with Dexie
- Background sync when the device comes back online
- Live owner dashboard updates through Supabase realtime
- Product browsing while offline
- PWA manifest, service worker, and install prompt support
- Dark/Light theme toggle with system default detection
- Inline form validation and toast-based error handling
- Responsive bottom navigation and touch-friendly controls

## Prerequisites

- Node.js 18 or newer
- A free Supabase account
- (Optional) Vercel or Netlify account for hosting

## Clone And Install

1. Clone or open this workspace.
2. Install dependencies:

```bash
npm install
```

## Create A Supabase Project

1. Sign in to Supabase.
2. Create a new project.
3. Copy the project URL and anon key from the project settings.
4. Put them in `.env` based on `.env.example`.

## Run The Schema

1. Open the Supabase SQL editor.
2. Paste the contents of `supabase/schema.sql`.
3. Run the script.
4. If migrating from an older version, also run `supabase/migration_packaging_model.sql` for the packaging system.
5. Create the `public.users` rows for your owner and employees.

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## Create The First Owner Account

1. In Supabase Auth, create a new email/password user for the owner.
2. Copy the user ID from the Auth dashboard.
3. Insert a matching row into `public.users` with `role = 'owner'`.
4. Use the same email and password to sign in through the app.

Example SQL:

```sql
insert into public.users (id, name, role)
values ('<auth-user-uuid>', 'Owner Name', 'owner');
```

## Create An Employee Record

Employees are PIN-only in the app.

1. Generate a bcrypt hash for the employee PIN.
2. Insert a row into `public.users` with `role = 'employee'` and the hashed PIN.

Example SQL:

```sql
insert into public.users (id, name, role, pin)
values (gen_random_uuid(), 'Employee Name', 'employee', '$2a$10$replace_with_bcrypt_hash');
```

## Run Locally

```bash
npm run dev
```

Visit http://localhost:5173 to access the app.

## Theme System

The app supports Light, Dark, and System (default) theme modes. The theme preference is stored in localStorage and persists across sessions. You can toggle themes using the menu button in the top-right corner of the app.

## Build For Production

```bash
npm run build
```

This generates the optimized app in the `dist/` directory, ready for deployment.

## Deploy To Vercel (Recommended)

### Option 1: Using Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts to link your GitHub repo and deploy. Set your environment variables (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`) in the Vercel Dashboard under Project Settings > Environment Variables.

### Option 2: Using GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and click "New Project"
3. Import your GitHub repository
4. Add the environment variables in the "Environment Variables" section
5. Click "Deploy"

Vercel will automatically rebuild and deploy on every push to `main` branch.

## Deploy To Netlify

1. Push your code to GitHub
2. Go to [netlify.com](https://netlify.com) and click "Add new site"
3. Select "Connect to Git" and choose your repository
4. Set Build command: `npm run build`
5. Set Publish directory: `dist`
6. Add environment variables under "Build & deploy" > "Environment"
7. Click "Deploy site"

The build output is written to `dist/`.

## Deploy As A Static Site

StoreWatch can be deployed to:

- Vercel
- Netlify
- Render static hosting

Use these build settings:

- Build command: `npm run build`
- Output directory: `dist`

## Default Test Credentials

Use these after setup:

- Owner email: `owner@storewatch.local`
- Owner password: `ChangeMe123!`
- Employee PIN: `1234`

Create matching records in Supabase before using them.

## Notes

- Employee write access is optimized for PIN-based use from the client and offline sync.
- When online, the app refreshes the product cache from Supabase and syncs pending local records.
- The service worker is registered through vite-plugin-pwa and the app ships with placeholder PWA icons in `public/`.
