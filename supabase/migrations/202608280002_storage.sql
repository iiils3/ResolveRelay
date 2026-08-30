insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('case-evidence','case-evidence',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do nothing;

create policy evidence_upload_own_folder on storage.objects for insert to authenticated
with check(bucket_id='case-evidence' and (storage.foldername(name))[1]=auth.uid()::text);

create policy evidence_read_authorized on storage.objects for select to authenticated
using(bucket_id='case-evidence' and exists(select 1 from public.evidence e where e.storage_path=name and public.can_access_case(e.case_id)));
