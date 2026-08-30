revoke execute on function public.can_access_case(uuid) from public, anon;
revoke execute on function public.is_case_consumer(uuid) from public, anon;
revoke execute on function public.owns_merchant(uuid) from public, anon;
grant execute on function public.can_access_case(uuid) to authenticated;
grant execute on function public.is_case_consumer(uuid) to authenticated;
grant execute on function public.owns_merchant(uuid) to authenticated;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

alter policy cases_authorized_select on public.cases to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.can_access_case(id)
);
alter policy cases_consumer_insert on public.cases to authenticated with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid()
);
alter policy cases_consumer_details_update on public.cases to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid() and status=any(array['draft'::public.case_status,'ready'::public.case_status])
) with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and consumer_id=auth.uid() and status=any(array['draft'::public.case_status,'ready'::public.case_status])
);

alter policy events_authorized_select on public.case_events to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.can_access_case(case_id)
);
alter policy evidence_authorized_select on public.evidence to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.can_access_case(case_id) and (merchant_visible or public.is_case_consumer(case_id))
);
alter policy evidence_consumer_insert on public.evidence to authenticated with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and uploaded_by=auth.uid() and public.is_case_consumer(case_id)
);
alter policy responses_authorized_select on public.merchant_responses to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.can_access_case(case_id)
);
alter policy offers_authorized_select on public.resolution_offers to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.can_access_case(case_id)
);
alter policy transactions_authorized_select on public.transactions to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.can_access_case(case_id)
);
alter policy transactions_consumer_write on public.transactions to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.is_case_consumer(case_id)
) with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.is_case_consumer(case_id)
);

alter policy channels_owner_write on public.merchant_support_channels to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.owns_merchant(merchant_id)
) with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and public.owns_merchant(merchant_id)
);
alter policy channels_verified_consumers on public.merchant_support_channels to authenticated using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and (verified=true or public.owns_merchant(merchant_id))
);

alter policy contact_attempts_select on public.contact_attempts using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and (
    profile_id=auth.uid() or (
      merchant_visible and exists (
        select 1 from public.case_members m where m.case_id=contact_attempts.case_id and m.profile_id=auth.uid() and m.role='merchant' and m.revoked_at is null
      )
    )
  )
);
alter policy contact_attempts_insert on public.contact_attempts with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and profile_id=auth.uid() and exists (
    select 1 from public.cases c where c.id=contact_attempts.case_id and c.consumer_id=auth.uid()
  )
);
alter policy contact_attempts_update on public.contact_attempts using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and profile_id=auth.uid() and exists (
    select 1 from public.cases c where c.id=contact_attempts.case_id and c.consumer_id=auth.uid()
  )
) with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and profile_id=auth.uid() and exists (
    select 1 from public.cases c where c.id=contact_attempts.case_id and c.consumer_id=auth.uid()
  )
);
alter policy contact_attempts_delete on public.contact_attempts using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and profile_id=auth.uid() and exists (
    select 1 from public.cases c where c.id=contact_attempts.case_id and c.consumer_id=auth.uid()
  )
);

alter policy evidence_read_authorized on storage.objects using (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and bucket_id='case-evidence' and exists (
    select 1 from public.evidence e where e.storage_path=objects.name and public.can_access_case(e.case_id)
  )
);
alter policy evidence_upload_own_folder on storage.objects with check (
  coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false and bucket_id='case-evidence' and (storage.foldername(name))[1]=(auth.uid())::text
);
