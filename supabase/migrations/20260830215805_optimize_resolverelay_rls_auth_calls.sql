alter policy cases_authorized_select on public.cases
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and can_access_case(id)
);

alter policy cases_consumer_details_update on public.cases
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and consumer_id=(select auth.uid())
  and status=any(array['draft'::case_status,'ready'::case_status])
)
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and consumer_id=(select auth.uid())
  and status=any(array['draft'::case_status,'ready'::case_status])
);

alter policy cases_consumer_insert on public.cases
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and consumer_id=(select auth.uid())
);

alter policy transactions_authorized_select on public.transactions
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and can_access_case(case_id)
);

alter policy transactions_consumer_write on public.transactions
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and is_case_consumer(case_id)
)
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and is_case_consumer(case_id)
);

alter policy notifications_self on public.notifications
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and profile_id=(select auth.uid())
);

alter policy notifications_self_update on public.notifications
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and profile_id=(select auth.uid())
)
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and profile_id=(select auth.uid())
);

alter policy events_authorized_select on public.case_events
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and can_access_case(case_id)
);

alter policy members_authorized_select on public.case_members
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and (
    profile_id=(select auth.uid())
    or is_case_consumer(case_id)
    or (merchant_id is not null and owns_merchant(merchant_id))
  )
);

alter policy profiles_self_select on public.profiles
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and id=(select auth.uid())
);

alter policy profiles_self_name_update on public.profiles
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and id=(select auth.uid())
)
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and id=(select auth.uid())
);

alter policy merchants_member_select on public.merchants
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and (
    owner_profile_id=(select auth.uid())
    or exists (
      select 1 from public.cases c
      where c.merchant_id=merchants.id
        and c.consumer_id=(select auth.uid())
    )
  )
);

alter policy merchants_owner_update on public.merchants
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and owner_profile_id=(select auth.uid())
)
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and owner_profile_id=(select auth.uid())
);

alter policy product_fingerprints_select_own on public.product_fingerprints
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and consumer_id=(select auth.uid())
);

alter policy product_fingerprints_insert_own on public.product_fingerprints
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and consumer_id=(select auth.uid())
);

alter policy product_fingerprints_update_own on public.product_fingerprints
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and consumer_id=(select auth.uid())
)
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and consumer_id=(select auth.uid())
);

alter policy product_fingerprints_delete_own on public.product_fingerprints
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and consumer_id=(select auth.uid())
);

alter policy evidence_authorized_select on public.evidence
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and can_access_case(case_id)
  and (merchant_visible or is_case_consumer(case_id))
);

alter policy evidence_consumer_insert on public.evidence
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and uploaded_by=(select auth.uid())
  and is_case_consumer(case_id)
);

alter policy responses_authorized_select on public.merchant_responses
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and can_access_case(case_id)
);

alter policy offers_authorized_select on public.resolution_offers
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and can_access_case(case_id)
);

alter policy channels_owner_write on public.merchant_support_channels
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and owns_merchant(merchant_id)
)
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and owns_merchant(merchant_id)
);

alter policy channels_verified_consumers on public.merchant_support_channels
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and (verified=true or owns_merchant(merchant_id))
);

alter policy contact_attempts_select on public.contact_attempts
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and (
    profile_id=(select auth.uid())
    or (
      merchant_visible
      and exists (
        select 1 from public.case_members m
        where m.case_id=contact_attempts.case_id
          and m.profile_id=(select auth.uid())
          and m.role='merchant'::app_role
          and m.revoked_at is null
      )
    )
  )
);

alter policy contact_attempts_insert on public.contact_attempts
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and profile_id=(select auth.uid())
  and exists (
    select 1 from public.cases c
    where c.id=contact_attempts.case_id
      and c.consumer_id=(select auth.uid())
  )
);

alter policy contact_attempts_update on public.contact_attempts
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and profile_id=(select auth.uid())
  and exists (
    select 1 from public.cases c
    where c.id=contact_attempts.case_id
      and c.consumer_id=(select auth.uid())
  )
)
with check (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and profile_id=(select auth.uid())
  and exists (
    select 1 from public.cases c
    where c.id=contact_attempts.case_id
      and c.consumer_id=(select auth.uid())
  )
);

alter policy contact_attempts_delete on public.contact_attempts
using (
  coalesce(((select auth.jwt())->>'is_anonymous')::boolean,false)=false
  and profile_id=(select auth.uid())
  and exists (
    select 1 from public.cases c
    where c.id=contact_attempts.case_id
      and c.consumer_id=(select auth.uid())
  )
);
