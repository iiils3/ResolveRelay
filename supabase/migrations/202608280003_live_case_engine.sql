alter table public.case_events add column if not exists actor_role public.app_role;
alter table public.case_members add column if not exists revoked_at timestamptz;
alter table public.case_members add column if not exists token_used_at timestamptz;
alter table public.case_members drop constraint if exists member_identity;
alter table public.case_members add constraint member_identity check (((profile_id is not null)::int+(merchant_id is not null)::int=1) or (profile_id is null and merchant_id is null and invite_token_hash is not null and role='merchant'));

drop policy if exists cases_consumer_draft_update on public.cases;
create policy cases_consumer_details_update on public.cases for update using(consumer_id=auth.uid() and status in ('draft','ready')) with check(consumer_id=auth.uid() and status in ('draft','ready'));

drop policy if exists members_authorized_select on public.case_members;
create policy members_authorized_select on public.case_members for select using(profile_id=auth.uid() or public.is_case_consumer(case_id) or (merchant_id is not null and public.owns_merchant(merchant_id)));

create or replace function public.can_access_case(target uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.cases c where c.id=target and (c.consumer_id=auth.uid() or (c.merchant_id is not null and public.owns_merchant(c.merchant_id)) or exists(select 1 from public.case_members cm where cm.case_id=c.id and cm.revoked_at is null and (cm.profile_id=auth.uid() or (cm.merchant_id is not null and public.owns_merchant(cm.merchant_id))))))$$;

create or replace function public.create_consumer_case(case_input jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid; actor_role public.app_role;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select role into actor_role from public.profiles where id=auth.uid();
  if actor_role is distinct from 'consumer' then raise exception 'consumer role required'; end if;
  insert into public.cases(consumer_id,title,description,status,requested_resolution) values(auth.uid(),'Order not delivered',case_input->>'description','ready',(case_input->>'requested_resolution')::public.resolution_kind) returning id into new_id;
  insert into public.case_members(case_id,profile_id,role,accepted_at) values(new_id,auth.uid(),'consumer',now());
  insert into public.transactions(case_id,consumer_name,merchant_name,product_service,amount,currency,order_id,purchase_date,promised_delivery_date,consumer_verified_at) values(new_id,case_input->>'consumer_name',case_input->>'merchant_name',case_input->>'product_service',(case_input->>'amount')::numeric,upper(case_input->>'currency'),case_input->>'order_id',(case_input->>'purchase_date')::date,nullif(case_input->>'promised_delivery_date','')::date,now());
  insert into public.case_events(case_id,actor_profile_id,actor_role,event_type,to_status,payload) values(new_id,auth.uid(),'consumer','case_prepared','ready',jsonb_build_object('label','Case prepared','detail','Purchase details and evidence approved by consumer.'));
  return new_id;
end$$;

revoke all on function public.create_consumer_case(jsonb) from public;
grant execute on function public.create_consumer_case(jsonb) to authenticated;

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_name_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create or replace function public.prevent_profile_role_change() returns trigger language plpgsql set search_path='' as $$begin if new.role<>old.role and auth.role()<>'service_role' then raise exception 'profile role is server managed';end if;return new;end$$;
create trigger profile_role_guard before update on public.profiles for each row execute function public.prevent_profile_role_change();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,role,display_name) values(new.id,'consumer',coalesce(new.raw_user_meta_data->>'name','')) on conflict(id) do nothing;return new;end$$;

alter publication supabase_realtime add table public.merchant_responses,public.resolution_offers;
