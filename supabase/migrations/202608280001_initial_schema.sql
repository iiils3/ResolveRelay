create extension if not exists pgcrypto;

create type public.app_role as enum ('consumer','merchant');
create type public.case_status as enum ('draft','ready','submitted','merchant_viewed','evidence_requested','consumer_replied','resolution_offered','resolved','rejected','closed');
create type public.resolution_kind as enum ('full_refund','partial_refund','replacement','merchant_response','other');
create type public.offer_status as enum ('pending','accepted','declined','withdrawn');
create type public.support_channel_type as enum ('support_url','complaints_email','contact_url');

create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,role public.app_role not null,display_name text not null,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.merchants(id uuid primary key default gen_random_uuid(),name text not null,owner_profile_id uuid not null references public.profiles(id),contact_name text not null,business_email text not null,created_at timestamptz not null default now());
create table public.cases(id uuid primary key default gen_random_uuid(),consumer_id uuid not null references public.profiles(id),merchant_id uuid references public.merchants(id),title text not null default 'Order not delivered',description text not null,status public.case_status not null default 'draft',requested_resolution public.resolution_kind not null,submitted_at timestamptz,resolved_at timestamptz,version integer not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.case_members(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,profile_id uuid references public.profiles(id) on delete cascade,merchant_id uuid references public.merchants(id) on delete cascade,role public.app_role not null,invite_token_hash text unique,invite_expires_at timestamptz,accepted_at timestamptz,allowed_evidence boolean not null default true,created_at timestamptz not null default now(),constraint member_identity check ((profile_id is not null)::int+(merchant_id is not null)::int=1));
create table public.transactions(id uuid primary key default gen_random_uuid(),case_id uuid not null unique references public.cases(id) on delete cascade,consumer_name text not null,merchant_name text not null,product_service text not null,amount numeric(14,2) not null check(amount>=0),currency text not null check(char_length(currency)=3),order_id text not null,purchase_date date not null,promised_delivery_date date,consumer_verified_at timestamptz,created_at timestamptz not null default now());
create table public.evidence(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,uploaded_by uuid not null references public.profiles(id),storage_path text not null unique,file_name text not null,mime_type text not null,file_size bigint not null check(file_size>0 and file_size<=10485760),category text not null default 'purchase_proof',merchant_visible boolean not null default true,created_at timestamptz not null default now());
create table public.case_events(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,actor_profile_id uuid references public.profiles(id),event_type text not null,from_status public.case_status,to_status public.case_status,payload jsonb not null default '{}',created_at timestamptz not null default now());
create table public.merchant_responses(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,merchant_id uuid not null references public.merchants(id),response_type text not null check(response_type in ('evidence_request','explanation','rejection')),message text not null,created_at timestamptz not null default now());
create table public.resolution_offers(id uuid primary key default gen_random_uuid(),case_id uuid not null references public.cases(id) on delete cascade,merchant_id uuid not null references public.merchants(id),kind public.resolution_kind not null,amount numeric(14,2),currency text,note text not null,status public.offer_status not null default 'pending',responded_at timestamptz,refund_received_at timestamptz,created_at timestamptz not null default now(),constraint refund_amount check(kind<>'partial_refund' or amount is not null));
create table public.notifications(id uuid primary key default gen_random_uuid(),profile_id uuid not null references public.profiles(id) on delete cascade,case_id uuid references public.cases(id) on delete cascade,type text not null,title text not null,body text not null,read_at timestamptz,created_at timestamptz not null default now());
create table public.merchant_support_channels(id uuid primary key default gen_random_uuid(),merchant_id uuid not null references public.merchants(id) on delete cascade,type public.support_channel_type not null,value text not null,source_url text not null,verified boolean not null default false,verified_at timestamptz,created_at timestamptz not null default now(),constraint verification_consistent check((verified=false and verified_at is null) or (verified=true and verified_at is not null)));

create index cases_consumer_idx on public.cases(consumer_id);
create index cases_merchant_idx on public.cases(merchant_id);
create index case_members_case_idx on public.case_members(case_id);
create index events_case_created_idx on public.case_events(case_id,created_at);
create index notifications_profile_idx on public.notifications(profile_id,created_at desc);

create or replace function public.owns_merchant(target uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.merchants m where m.id=target and m.owner_profile_id=auth.uid())$$;
create or replace function public.can_access_case(target uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.cases c where c.id=target and (c.consumer_id=auth.uid() or (c.merchant_id is not null and public.owns_merchant(c.merchant_id)) or exists(select 1 from public.case_members cm where cm.case_id=c.id and cm.profile_id=auth.uid() and cm.accepted_at is not null)))$$;
create or replace function public.is_case_consumer(target uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.cases c where c.id=target and c.consumer_id=auth.uid())$$;
create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,role,display_name) values(new.id,coalesce((new.raw_user_meta_data->>'role')::public.app_role,'consumer'),coalesce(new.raw_user_meta_data->>'name',''));return new;end$$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.cases enable row level security;
alter table public.case_members enable row level security;
alter table public.transactions enable row level security;
alter table public.evidence enable row level security;
alter table public.case_events enable row level security;
alter table public.merchant_responses enable row level security;
alter table public.resolution_offers enable row level security;
alter table public.notifications enable row level security;
alter table public.merchant_support_channels enable row level security;

create policy profiles_self_select on public.profiles for select using(id=auth.uid());
create policy profiles_self_update on public.profiles for update using(id=auth.uid()) with check(id=auth.uid());
create policy merchants_member_select on public.merchants for select using(owner_profile_id=auth.uid() or exists(select 1 from public.cases c where c.merchant_id=id and c.consumer_id=auth.uid()));
create policy merchants_owner_update on public.merchants for update using(owner_profile_id=auth.uid()) with check(owner_profile_id=auth.uid());
create policy cases_authorized_select on public.cases for select using(public.can_access_case(id));
create policy cases_consumer_insert on public.cases for insert with check(consumer_id=auth.uid());
create policy cases_consumer_draft_update on public.cases for update using(consumer_id=auth.uid() and status in ('draft','ready')) with check(consumer_id=auth.uid() and status in ('draft','ready'));
create policy members_authorized_select on public.case_members for select using(public.can_access_case(case_id));
create policy transactions_authorized_select on public.transactions for select using(public.can_access_case(case_id));
create policy transactions_consumer_write on public.transactions for all using(public.is_case_consumer(case_id)) with check(public.is_case_consumer(case_id));
create policy evidence_authorized_select on public.evidence for select using(public.can_access_case(case_id) and (merchant_visible or public.is_case_consumer(case_id)));
create policy evidence_consumer_insert on public.evidence for insert with check(uploaded_by=auth.uid() and public.is_case_consumer(case_id));
create policy events_authorized_select on public.case_events for select using(public.can_access_case(case_id));
create policy responses_authorized_select on public.merchant_responses for select using(public.can_access_case(case_id));
create policy offers_authorized_select on public.resolution_offers for select using(public.can_access_case(case_id));
create policy notifications_self on public.notifications for select using(profile_id=auth.uid());
create policy notifications_self_update on public.notifications for update using(profile_id=auth.uid()) with check(profile_id=auth.uid());
create policy channels_verified_consumers on public.merchant_support_channels for select using(verified=true or public.owns_merchant(merchant_id));
create policy channels_owner_write on public.merchant_support_channels for all using(public.owns_merchant(merchant_id)) with check(public.owns_merchant(merchant_id));

alter publication supabase_realtime add table public.cases,public.case_events,public.notifications;
