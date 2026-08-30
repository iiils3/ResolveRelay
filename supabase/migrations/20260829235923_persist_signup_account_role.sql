create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role public.app_role;
  selected_name text;
begin
  selected_role := case lower(coalesce(new.raw_user_meta_data->>'account_role','consumer'))
    when 'merchant' then 'merchant'::public.app_role
    else 'consumer'::public.app_role
  end;
  selected_name := coalesce(nullif(new.raw_user_meta_data->>'name',''), nullif(split_part(coalesce(new.email,''),'@',1),''), 'User');
  insert into public.profiles(id,role,display_name)
  values(new.id,selected_role,selected_name)
  on conflict(id) do nothing;
  return new;
end
$$;
