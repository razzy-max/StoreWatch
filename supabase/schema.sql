create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid references auth.users (id) primary key,
  name text not null,
  role text check (role in ('owner', 'employee')) not null,
  pin text,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  category text not null,
  unit_price numeric not null,
  stock_qty integer not null default 0,
  low_stock_threshold integer not null default 5,
  created_at timestamptz default now()
);

create table if not exists public.sales (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products (id) not null,
  qty integer not null,
  total numeric not null,
  recorded_by uuid references public.users (id) not null,
  timestamp timestamptz default now(),
  synced boolean default false
);

create table if not exists public.stock_updates (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references public.products (id) not null,
  qty_added integer not null,
  recorded_by uuid references public.users (id) not null,
  timestamp timestamptz default now(),
  synced boolean default false
);

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.stock_updates enable row level security;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'owner'
  );
$$;

grant execute on function public.is_owner() to anon, authenticated;

drop policy if exists "Owner full access - users" on public.users;
drop policy if exists "Employee PIN lookup" on public.users;
drop policy if exists "Owner full access - products" on public.products;
drop policy if exists "Public read products" on public.products;
drop policy if exists "Owner full access - sales" on public.sales;
drop policy if exists "Anonymous insert sales" on public.sales;
drop policy if exists "Owner full access - stock_updates" on public.stock_updates;
drop policy if exists "Anonymous insert stock updates" on public.stock_updates;

create policy "Owner full access - users"
on public.users
for all
using (public.is_owner())
with check (public.is_owner());

create policy "Employee PIN lookup"
on public.users
for select
to anon
using (role = 'employee');

create policy "Owner full access - products"
on public.products
for all
using (public.is_owner())
with check (public.is_owner());

create policy "Public read products"
on public.products
for select
to anon, authenticated
using (true);

create policy "Owner full access - sales"
on public.sales
for all
using (public.is_owner())
with check (public.is_owner());

create policy "Anonymous insert sales"
on public.sales
for insert
to anon
with check (true);

create policy "Owner full access - stock_updates"
on public.stock_updates
for all
using (public.is_owner())
with check (public.is_owner());

create policy "Anonymous insert stock updates"
on public.stock_updates
for insert
to anon
with check (true);
