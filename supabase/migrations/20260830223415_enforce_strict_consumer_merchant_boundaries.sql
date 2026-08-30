create or replace function public.is_case_consumer(target uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
and exists (
  select 1 from public.profiles p
  where p.id=auth.uid() and p.role='consumer'::public.app_role
)
and exists (
  select 1 from public.cases c
  where c.id=target and c.consumer_id=auth.uid()
)
$$;

create or replace function public.owns_merchant(target uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
and exists (
  select 1 from public.profiles p
  where p.id=auth.uid() and p.role='merchant'::public.app_role
)
and exists (
  select 1 from public.merchants m
  where m.id=target and m.owner_profile_id=auth.uid()
)
$$;

create or replace function public.can_access_case(target uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false
and exists (
  select 1
  from public.cases c
  where c.id=target
    and (
      (
        exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='consumer'::public.app_role)
        and c.consumer_id=auth.uid()
      )
      or
      (
        exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='merchant'::public.app_role)
        and (
          (c.merchant_id is not null and public.owns_merchant(c.merchant_id))
          or exists(
            select 1 from public.case_members cm
            where cm.case_id=c.id
              and cm.role='merchant'::public.app_role
              and cm.profile_id=auth.uid()
              and cm.revoked_at is null
          )
          or exists(
            select 1 from public.case_members cm
            where cm.case_id=c.id
              and cm.role='merchant'::public.app_role
              and cm.merchant_id is not null
              and cm.revoked_at is null
              and public.owns_merchant(cm.merchant_id)
          )
        )
      )
    )
)
$$;

with ranked as (
  select id,
         row_number() over (
           partition by case_id
           order by accepted_at desc nulls last, created_at desc, id
         ) as rn
  from public.case_members
  where role='merchant'::public.app_role
    and profile_id is not null
    and revoked_at is null
)
update public.case_members cm
set revoked_at=now()
from ranked r
where cm.id=r.id and r.rn>1;

create unique index if not exists case_members_one_active_merchant_per_case
on public.case_members(case_id)
where role='merchant'::public.app_role
  and profile_id is not null
  and revoked_at is null;
