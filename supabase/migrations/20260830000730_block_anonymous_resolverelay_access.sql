create or replace function public.is_case_consumer(target uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
and exists(select 1 from public.cases c where c.id=target and c.consumer_id=auth.uid())
$$;

create or replace function public.owns_merchant(target uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
and exists(select 1 from public.merchants m where m.id=target and m.owner_profile_id=auth.uid())
$$;

create or replace function public.can_access_case(target uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
and exists(select 1 from public.cases c where c.id=target and (
  c.consumer_id=auth.uid()
  or (c.merchant_id is not null and public.owns_merchant(c.merchant_id))
  or exists(select 1 from public.case_members cm where cm.case_id=c.id and cm.revoked_at is null and (cm.profile_id=auth.uid() or (cm.merchant_id is not null and public.owns_merchant(cm.merchant_id))))
))
$$;

create or replace function public.create_consumer_case(case_input jsonb)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare new_id uuid; actor_role public.app_role;
begin
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=true then raise exception 'registered account required'; end if;
  select role into actor_role from public.profiles where id=auth.uid();
  if actor_role is distinct from 'consumer' then raise exception 'consumer role required'; end if;
  insert into public.cases(consumer_id,title,description,status,requested_resolution)
  values(auth.uid(),'Order not delivered',case_input->>'description','ready',(case_input->>'requested_resolution')::public.resolution_kind) returning id into new_id;
  insert into public.case_members(case_id,profile_id,role,accepted_at) values(new_id,auth.uid(),'consumer',now());
  insert into public.transactions(case_id,consumer_name,merchant_name,product_service,product_url,amount,currency,order_id,purchase_date,promised_delivery_date,consumer_verified_at)
  values(new_id,case_input->>'consumer_name',case_input->>'merchant_name',case_input->>'product_service',nullif(case_input->>'product_url',''),(case_input->>'amount')::numeric,upper(case_input->>'currency'),case_input->>'order_id',(case_input->>'purchase_date')::date,nullif(case_input->>'promised_delivery_date','')::date,now());
  insert into public.case_events(case_id,actor_profile_id,actor_role,event_type,to_status,payload) values(new_id,auth.uid(),'consumer','case_prepared','ready',jsonb_build_object('label','Case prepared','detail','Purchase details and evidence approved by consumer.'));
  return new_id;
end
$$;

alter policy cases_consumer_insert on public.cases with check (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid());
alter policy cases_consumer_details_update on public.cases using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid() and status=any(array['draft'::public.case_status,'ready'::public.case_status])) with check (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid() and status=any(array['draft'::public.case_status,'ready'::public.case_status]));
alter policy members_authorized_select on public.case_members using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and (profile_id=auth.uid() or public.is_case_consumer(case_id) or (merchant_id is not null and public.owns_merchant(merchant_id))));
alter policy profiles_self_select on public.profiles using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and id=auth.uid());
alter policy profiles_self_name_update on public.profiles using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and id=auth.uid()) with check (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and id=auth.uid());
alter policy notifications_self on public.notifications using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and profile_id=auth.uid());
alter policy notifications_self_update on public.notifications using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and profile_id=auth.uid()) with check (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and profile_id=auth.uid());
alter policy product_fingerprints_select_own on public.product_fingerprints using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid());
alter policy product_fingerprints_insert_own on public.product_fingerprints with check (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid());
alter policy product_fingerprints_update_own on public.product_fingerprints using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid()) with check (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid());
alter policy product_fingerprints_delete_own on public.product_fingerprints using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid());
alter policy merchants_member_select on public.merchants using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and (owner_profile_id=auth.uid() or exists(select 1 from public.cases c where c.merchant_id=id and c.consumer_id=auth.uid())));
alter policy merchants_owner_update on public.merchants using (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and owner_profile_id=auth.uid()) with check (coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and owner_profile_id=auth.uid());

revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
