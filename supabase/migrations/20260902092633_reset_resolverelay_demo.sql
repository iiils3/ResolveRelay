create or replace function public.reset_resolverelay_demo()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := (select auth.uid());
  caller_role public.app_role;
  caller_name text;
  claim record;
  merchant_profile_id uuid;
  reset_count integer := 0;
begin
  if caller_id is null then
    raise exception 'Authentication required';
  end if;

  select role, display_name
    into caller_role, caller_name
  from public.profiles
  where id = caller_id;

  if caller_role is distinct from 'consumer'::public.app_role
     or caller_name is distinct from 'Demo Consumer' then
    raise exception 'Demo reset is not available for this account';
  end if;

  for claim in
    select c.id, c.merchant_id, t.order_id
    from public.cases c
    join public.transactions t on t.case_id = c.id
    where c.consumer_id = caller_id
      and t.order_id in ('NS-48219', 'NS-77521', 'NS-19304')
    for update of c
  loop
    select cm.profile_id
      into merchant_profile_id
    from public.case_members cm
    join public.profiles p on p.id = cm.profile_id
    where cm.case_id = claim.id
      and cm.role = 'merchant'::public.app_role
      and cm.revoked_at is null
      and p.role = 'merchant'::public.app_role
    order by cm.accepted_at desc nulls last, cm.created_at desc
    limit 1;

    if merchant_profile_id is null then
      raise exception 'Demo merchant membership is incomplete';
    end if;

    delete from public.notifications where case_id = claim.id;
    delete from public.contact_attempts where case_id = claim.id;
    delete from public.merchant_responses where case_id = claim.id;
    delete from public.resolution_offers where case_id = claim.id;
    delete from public.case_events where case_id = claim.id;

    if claim.order_id = 'NS-48219' then
      update public.cases
      set status = 'ready', version = 1, submitted_at = null,
          resolved_at = null, updated_at = now() - interval '20 minutes'
      where id = claim.id;

      insert into public.case_events
        (case_id, actor_profile_id, actor_role, event_type, from_status, to_status, payload, created_at)
      values
        (claim.id, caller_id, 'consumer', 'case_prepared', null, 'ready',
         jsonb_build_object('label', 'Case prepared for shared review'), now() - interval '20 minutes');

    elsif claim.order_id = 'NS-77521' then
      update public.cases
      set status = 'merchant_viewed', version = 3,
          submitted_at = now() - interval '2 hours', resolved_at = null,
          updated_at = now() - interval '90 minutes'
      where id = claim.id;

      insert into public.case_events
        (case_id, actor_profile_id, actor_role, event_type, from_status, to_status, payload, created_at)
      values
        (claim.id, caller_id, 'consumer', 'case_prepared', null, 'ready',
         jsonb_build_object('label', 'Case prepared for shared review'), now() - interval '3 hours'),
        (claim.id, caller_id, 'consumer', 'submit', 'ready', 'submitted',
         jsonb_build_object('label', 'Claim shared with merchant'), now() - interval '2 hours'),
        (claim.id, merchant_profile_id, 'merchant', 'view', 'submitted', 'merchant_viewed',
         jsonb_build_object('label', 'Merchant viewed claim'), now() - interval '90 minutes');

    elsif claim.order_id = 'NS-19304' then
      update public.cases
      set status = 'resolution_offered', version = 4,
          submitted_at = now() - interval '5 hours', resolved_at = null,
          updated_at = now() - interval '30 minutes'
      where id = claim.id;

      insert into public.resolution_offers
        (case_id, merchant_id, kind, amount, currency, note, status, created_at)
      values
        (claim.id, claim.merchant_id, 'full_refund', null, 'USD',
         'Full refund offered after reviewing the shared purchase record.',
         'pending', now() - interval '30 minutes');

      insert into public.case_events
        (case_id, actor_profile_id, actor_role, event_type, from_status, to_status, payload, created_at)
      values
        (claim.id, caller_id, 'consumer', 'case_prepared', null, 'ready',
         jsonb_build_object('label', 'Case prepared for shared review'), now() - interval '6 hours'),
        (claim.id, caller_id, 'consumer', 'submit', 'ready', 'submitted',
         jsonb_build_object('label', 'Claim shared with merchant'), now() - interval '5 hours'),
        (claim.id, merchant_profile_id, 'merchant', 'view', 'submitted', 'merchant_viewed',
         jsonb_build_object('label', 'Merchant viewed claim'), now() - interval '4 hours'),
        (claim.id, merchant_profile_id, 'merchant', 'offer', 'merchant_viewed', 'resolution_offered',
         jsonb_build_object('label', 'Full refund offered'), now() - interval '30 minutes');
    end if;

    reset_count := reset_count + 1;
  end loop;

  if reset_count <> 3 then
    raise exception 'Demo fixtures are incomplete';
  end if;

  return reset_count;
end;
$$;

revoke all on function public.reset_resolverelay_demo() from public, anon;
grant execute on function public.reset_resolverelay_demo() to authenticated;
