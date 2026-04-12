-- StoreWatch wholesale + retail evolution migration
-- Safe to run on an existing project with current StoreWatch schema.
-- This migration is additive and backward-compatible with the current app.

begin;

create extension if not exists pgcrypto;

-- 1) Ensure owner check function is non-recursive under RLS.
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

-- 2) Evolve products to canonical smallest-unit stock.
alter table public.products
  add column if not exists base_unit_name text not null default 'Bottle',
  add column if not exists stock_base_units bigint,
  add column if not exists low_stock_threshold_base_units bigint;

update public.products
set stock_base_units = coalesce(stock_base_units, stock_qty),
    low_stock_threshold_base_units = coalesce(low_stock_threshold_base_units, low_stock_threshold)
where stock_base_units is null
   or low_stock_threshold_base_units is null;

alter table public.products
  alter column stock_base_units set not null,
  alter column stock_base_units set default 0,
  alter column low_stock_threshold_base_units set not null,
  alter column low_stock_threshold_base_units set default 5;

-- Allow custom categories.
alter table public.products
  drop constraint if exists products_category_check;

-- 3) Packaging options per product.
create table if not exists public.product_packaging (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  label text not null,
  units_per_package integer not null check (units_per_package > 0),
  selling_price_per_package numeric not null check (selling_price_per_package >= 0),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  unique(product_id, label)
);

create index if not exists idx_product_packaging_product_id on public.product_packaging(product_id);
create index if not exists idx_product_packaging_default on public.product_packaging(product_id, is_default);

-- Backfill one default "Single" package from existing unit_price.
insert into public.product_packaging (product_id, label, units_per_package, selling_price_per_package, is_default)
select p.id, 'Single', 1, p.unit_price, true
from public.products p
where not exists (
  select 1 from public.product_packaging pp where pp.product_id = p.id
);

-- If product already has packages but no default, mark Single as default when available.
update public.product_packaging pp
set is_default = true
where pp.label = 'Single'
  and not exists (
    select 1
    from public.product_packaging p2
    where p2.product_id = pp.product_id
      and p2.is_default = true
  );

-- 4) Inventory movement ledger (immutable events).
create table if not exists public.inventory_movements (
  id uuid primary key,
  product_id uuid not null references public.products(id),
  packaging_id uuid references public.product_packaging(id),
  movement_type text not null check (movement_type in ('sale', 'stock_receive', 'adjustment', 'return', 'breakage')),
  entered_qty integer not null check (entered_qty > 0),
  delta_base_units integer not null,
  unit_price_snapshot numeric,
  recorded_by uuid references public.users(id),
  timestamp timestamptz not null default now(),
  synced boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_inventory_movements_product on public.inventory_movements(product_id, timestamp desc);
create index if not exists idx_inventory_movements_recorded_by on public.inventory_movements(recorded_by, timestamp desc);

-- 5) Extend existing sales/stock_updates for packaging-aware future app updates.
alter table public.sales
  add column if not exists packaging_id uuid references public.product_packaging(id),
  add column if not exists qty_base_units integer,
  add column if not exists unit_price_snapshot numeric;

alter table public.stock_updates
  add column if not exists packaging_id uuid references public.product_packaging(id),
  add column if not exists qty_base_units integer,
  add column if not exists cost_price_per_unit numeric;

-- Backfill for existing rows.
update public.sales
set qty_base_units = coalesce(qty_base_units, qty),
    unit_price_snapshot = coalesce(unit_price_snapshot, case when qty > 0 then total / qty else null end)
where qty_base_units is null
   or unit_price_snapshot is null;

update public.stock_updates
set qty_base_units = coalesce(qty_base_units, qty_added)
where qty_base_units is null;

-- 6) Keep old stock_qty and new stock_base_units synchronized (for backward compatibility).
create or replace function public.products_sync_stock_columns()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.stock_base_units is null then
      new.stock_base_units := coalesce(new.stock_qty, 0);
    end if;
    new.stock_qty := new.stock_base_units;
    return new;
  end if;

  if new.stock_base_units is distinct from old.stock_base_units then
    new.stock_qty := new.stock_base_units;
    return new;
  end if;

  if new.stock_qty is distinct from old.stock_qty then
    new.stock_base_units := new.stock_qty;
    return new;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_products_sync_stock_columns on public.products;
create trigger trg_products_sync_stock_columns
before insert or update on public.products
for each row
execute function public.products_sync_stock_columns();

-- 7) Apply inventory movement atomically and idempotently.
create or replace function public.apply_inventory_movement(
  p_id uuid,
  p_product_id uuid,
  p_packaging_id uuid,
  p_movement_type text,
  p_entered_qty integer,
  p_recorded_by uuid,
  p_unit_price_snapshot numeric default null,
  p_timestamp timestamptz default now(),
  p_synced boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_units_per_package integer;
  v_delta integer;
  v_stock bigint;
begin
  if exists (select 1 from public.inventory_movements where id = p_id) then
    return;
  end if;

  if p_entered_qty <= 0 then
    raise exception 'entered_qty must be > 0';
  end if;

  select units_per_package
  into v_units_per_package
  from public.product_packaging
  where id = p_packaging_id
    and product_id = p_product_id;

  if v_units_per_package is null then
    raise exception 'Invalid packaging_id for product';
  end if;

  if p_movement_type = 'sale' or p_movement_type = 'breakage' then
    v_delta := -(p_entered_qty * v_units_per_package);
  elsif p_movement_type = 'stock_receive' or p_movement_type = 'return' or p_movement_type = 'adjustment' then
    v_delta := p_entered_qty * v_units_per_package;
  else
    raise exception 'Invalid movement_type: %', p_movement_type;
  end if;

  select stock_base_units
  into v_stock
  from public.products
  where id = p_product_id
  for update;

  if v_stock is null then
    raise exception 'Product not found';
  end if;

  if v_stock + v_delta < 0 then
    raise exception 'Insufficient stock';
  end if;

  update public.products
  set stock_base_units = stock_base_units + v_delta,
      stock_qty = stock_base_units + v_delta
  where id = p_product_id;

  insert into public.inventory_movements (
    id,
    product_id,
    packaging_id,
    movement_type,
    entered_qty,
    delta_base_units,
    unit_price_snapshot,
    recorded_by,
    timestamp,
    synced
  )
  values (
    p_id,
    p_product_id,
    p_packaging_id,
    p_movement_type,
    p_entered_qty,
    v_delta,
    p_unit_price_snapshot,
    p_recorded_by,
    p_timestamp,
    p_synced
  );
end;
$$;

grant execute on function public.apply_inventory_movement(
  uuid,
  uuid,
  uuid,
  text,
  integer,
  uuid,
  numeric,
  timestamptz,
  boolean
) to anon, authenticated;

-- 8) Stock display helper view: "X crates, Y bottles" when crate-like package exists.
create or replace view public.v_product_stock_display as
with package_choice as (
  select
    p.id as product_id,
    coalesce(
      (
        select pp.id
        from public.product_packaging pp
        where pp.product_id = p.id
          and lower(pp.label) in ('crate', 'carton', 'case')
        order by pp.units_per_package desc
        limit 1
      ),
      (
        select pp.id
        from public.product_packaging pp
        where pp.product_id = p.id
          and pp.units_per_package > 1
        order by pp.units_per_package desc
        limit 1
      )
    ) as wholesale_packaging_id
  from public.products p
)
select
  p.id as product_id,
  p.name,
  p.category,
  p.base_unit_name,
  p.stock_base_units,
  wp.label as wholesale_label,
  wp.units_per_package as wholesale_units_per_package,
  case
    when wp.units_per_package is not null and wp.units_per_package > 1 then p.stock_base_units / wp.units_per_package
    else null
  end as wholesale_qty,
  case
    when wp.units_per_package is not null and wp.units_per_package > 1 then p.stock_base_units % wp.units_per_package
    else p.stock_base_units
  end as remainder_base_units
from public.products p
left join package_choice pc on pc.product_id = p.id
left join public.product_packaging wp on wp.id = pc.wholesale_packaging_id;

-- 9) RLS for new tables.
alter table public.product_packaging enable row level security;
alter table public.inventory_movements enable row level security;

drop policy if exists "Owner full access - product_packaging" on public.product_packaging;
drop policy if exists "Public read product_packaging" on public.product_packaging;
drop policy if exists "Owner full access - inventory_movements" on public.inventory_movements;
drop policy if exists "Anonymous insert inventory_movements" on public.inventory_movements;
drop policy if exists "Public read inventory_movements" on public.inventory_movements;

create policy "Owner full access - product_packaging"
on public.product_packaging
for all
using (public.is_owner())
with check (public.is_owner());

create policy "Public read product_packaging"
on public.product_packaging
for select
to anon, authenticated
using (true);

create policy "Owner full access - inventory_movements"
on public.inventory_movements
for all
using (public.is_owner())
with check (public.is_owner());

create policy "Anonymous insert inventory_movements"
on public.inventory_movements
for insert
to anon
with check (true);

create policy "Public read inventory_movements"
on public.inventory_movements
for select
to anon, authenticated
using (true);

commit;

-- Optional post-migration helper commands:
-- 1) Add a Crate package for a product (replace product_id, units, and price):
-- insert into public.product_packaging (product_id, label, units_per_package, selling_price_per_package, is_default)
-- values ('PRODUCT_UUID', 'Crate', 24, 15000, false)
-- on conflict (product_id, label) do update
-- set units_per_package = excluded.units_per_package,
--     selling_price_per_package = excluded.selling_price_per_package;

-- 2) Check stock display:
-- select * from public.v_product_stock_display order by name;
