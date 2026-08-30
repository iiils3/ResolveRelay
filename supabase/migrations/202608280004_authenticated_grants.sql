grant usage on schema public to authenticated;
grant select on public.profiles,public.merchants,public.cases,public.case_members,public.transactions,public.evidence,public.case_events,public.merchant_responses,public.resolution_offers,public.notifications,public.merchant_support_channels to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant update(title,description,requested_resolution,updated_at) on public.cases to authenticated;
grant insert on public.evidence to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant execute on function public.create_consumer_case(jsonb) to authenticated;
