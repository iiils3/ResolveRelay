alter table public.cases
  add column if not exists issue_type text not null default 'not_delivered';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cases_issue_type_check'
  ) then
    alter table public.cases add constraint cases_issue_type_check
      check (issue_type in ('not_delivered','wrong_item','damaged','refund_missing','service_not_delivered','subscription','not_as_described','other'));
  end if;
end $$;

create table if not exists public.contact_attempts (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('email','phone','chat','social','marketplace','other')),
  contacted_at timestamptz not null default now(),
  outcome text not null check (outcome in ('no_reply','promised_action','requested_info','declined','resolved','other')),
  note text not null default '' check (char_length(note) <= 2000),
  merchant_visible boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.contact_attempts enable row level security;

drop policy if exists "contact_attempts_select" on public.contact_attempts;
create policy "contact_attempts_select" on public.contact_attempts
for select to authenticated
using (
  profile_id = auth.uid()
  or (
    merchant_visible
    and exists (
      select 1 from public.case_members m
      where m.case_id = contact_attempts.case_id
        and m.profile_id = auth.uid()
        and m.role = 'merchant'
        and m.revoked_at is null
    )
  )
);

drop policy if exists "contact_attempts_insert" on public.contact_attempts;
create policy "contact_attempts_insert" on public.contact_attempts
for insert to authenticated
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.cases c
    where c.id = contact_attempts.case_id
      and c.consumer_id = auth.uid()
  )
);

drop policy if exists "contact_attempts_update" on public.contact_attempts;
create policy "contact_attempts_update" on public.contact_attempts
for update to authenticated
using (
  profile_id = auth.uid()
  and exists (
    select 1 from public.cases c
    where c.id = contact_attempts.case_id
      and c.consumer_id = auth.uid()
  )
)
with check (
  profile_id = auth.uid()
  and exists (
    select 1 from public.cases c
    where c.id = contact_attempts.case_id
      and c.consumer_id = auth.uid()
  )
);

drop policy if exists "contact_attempts_delete" on public.contact_attempts;
create policy "contact_attempts_delete" on public.contact_attempts
for delete to authenticated
using (
  profile_id = auth.uid()
  and exists (
    select 1 from public.cases c
    where c.id = contact_attempts.case_id
      and c.consumer_id = auth.uid()
  )
);

grant select, insert, update, delete on public.contact_attempts to authenticated;

create index if not exists contact_attempts_case_id_contacted_at_idx
  on public.contact_attempts(case_id, contacted_at desc);

create or replace function public.create_consumer_case(case_input jsonb)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  new_id uuid;
  actor_role public.app_role;
  issue text;
  case_title text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select role into actor_role from public.profiles where id=auth.uid();
  if actor_role is distinct from 'consumer' then raise exception 'consumer role required'; end if;

  issue := coalesce(nullif(case_input->>'issue_type',''), 'not_delivered');
  if issue not in ('not_delivered','wrong_item','damaged','refund_missing','service_not_delivered','subscription','not_as_described','other') then
    raise exception 'invalid issue type';
  end if;

  case_title := case issue
    when 'not_delivered' then 'Order not delivered'
    when 'wrong_item' then 'Wrong item received'
    when 'damaged' then 'Item arrived damaged'
    when 'refund_missing' then 'Refund not received'
    when 'service_not_delivered' then 'Service not delivered'
    when 'subscription' then 'Subscription or recurring charge issue'
    when 'not_as_described' then 'Product or service not as described'
    else 'Other purchase issue'
  end;

  insert into public.cases(consumer_id,title,description,status,requested_resolution,issue_type)
  values(auth.uid(),case_title,case_input->>'description','ready',(case_input->>'requested_resolution')::public.resolution_kind,issue)
  returning id into new_id;

  insert into public.case_members(case_id,profile_id,role,accepted_at)
  values(new_id,auth.uid(),'consumer',now());

  insert into public.transactions(case_id,consumer_name,merchant_name,product_service,product_url,amount,currency,order_id,purchase_date,promised_delivery_date,consumer_verified_at)
  values(new_id,case_input->>'consumer_name',case_input->>'merchant_name',case_input->>'product_service',nullif(case_input->>'product_url',''),(case_input->>'amount')::numeric,upper(case_input->>'currency'),case_input->>'order_id',(case_input->>'purchase_date')::date,nullif(case_input->>'promised_delivery_date','')::date,now());

  insert into public.case_events(case_id,actor_profile_id,actor_role,event_type,to_status,payload)
  values(new_id,auth.uid(),'consumer','case_prepared','ready',jsonb_build_object('label','Case prepared','detail','Purchase details and evidence approved by consumer.','issue_type',issue));

  return new_id;
end$function$;
