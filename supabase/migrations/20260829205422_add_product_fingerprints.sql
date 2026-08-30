create table if not exists public.product_fingerprints (
  id uuid primary key default gen_random_uuid(),
  consumer_id uuid not null references public.profiles(id) on delete cascade,
  merchant_name text,
  product_name text not null,
  product_url text,
  order_id text,
  amount numeric(18,3),
  currency text,
  purchased_at timestamptz,
  notes text,
  source text not null default 'manual' check (source in ('manual','chrome_extension')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.product_fingerprints enable row level security;

drop policy if exists product_fingerprints_select_own on public.product_fingerprints;
create policy product_fingerprints_select_own on public.product_fingerprints for select to authenticated using (consumer_id = auth.uid());

drop policy if exists product_fingerprints_insert_own on public.product_fingerprints;
create policy product_fingerprints_insert_own on public.product_fingerprints for insert to authenticated with check (consumer_id = auth.uid());

drop policy if exists product_fingerprints_update_own on public.product_fingerprints;
create policy product_fingerprints_update_own on public.product_fingerprints for update to authenticated using (consumer_id = auth.uid()) with check (consumer_id = auth.uid());

drop policy if exists product_fingerprints_delete_own on public.product_fingerprints;
create policy product_fingerprints_delete_own on public.product_fingerprints for delete to authenticated using (consumer_id = auth.uid());

create index if not exists product_fingerprints_consumer_created_idx on public.product_fingerprints (consumer_id, created_at desc);
