-- Add supplier cost tracking for stock receipts
-- Run this in Supabase SQL Editor on existing deployments

begin;

alter table if exists public.stock_updates
  add column if not exists cost_price_per_unit numeric,
  add column if not exists cost_price_per_package numeric;

commit;
