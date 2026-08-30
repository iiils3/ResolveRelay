grant usage on schema public to service_role;
grant select,update on public.cases to service_role;
grant select,update on public.profiles to service_role;
grant select,insert,update on public.case_members to service_role;
grant select,insert on public.merchants to service_role;
grant insert,update on public.resolution_offers to service_role;
grant insert on public.merchant_responses to service_role;
grant insert on public.case_events to service_role;
grant insert on public.notifications to service_role;
