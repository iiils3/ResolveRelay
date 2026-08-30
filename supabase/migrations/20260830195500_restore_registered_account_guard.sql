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
  if auth.uid() is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=true then
    raise exception 'registered account required';
  end if;

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
