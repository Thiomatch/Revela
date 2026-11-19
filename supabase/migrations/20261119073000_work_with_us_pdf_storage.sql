create or replace function public.can_access_revela_work_with_us_pdf(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.revela_work_with_us_agreements agreement
     where p_name in (
       agreement.applicant_user_id::text || '/agreements/' || agreement.id::text || '.pdf',
       agreement.applicant_user_id::text || '/agreements/' || agreement.id::text || '-final.pdf'
     )
       and (
         agreement.applicant_user_id = (select auth.uid())
         or public.is_revela_work_with_us_admin()
       )
  );
$$;

create or replace function public.can_upload_revela_work_with_us_pdf(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.revela_work_with_us_agreements agreement
     where (
       p_name = (
         agreement.applicant_user_id::text || '/agreements/' || agreement.id::text || '.pdf'
       )
       and (
         agreement.applicant_user_id = (select auth.uid())
         or public.is_revela_work_with_us_admin()
       )
     )
       or (
         p_name = (
           agreement.applicant_user_id::text || '/agreements/' || agreement.id::text || '-final.pdf'
         )
         and public.is_revela_work_with_us_admin()
       )
  );
$$;

revoke all on function public.can_access_revela_work_with_us_pdf(text) from public, anon;
revoke all on function public.can_upload_revela_work_with_us_pdf(text) from public, anon;
grant execute on function public.can_access_revela_work_with_us_pdf(text) to authenticated;
grant execute on function public.can_upload_revela_work_with_us_pdf(text) to authenticated;

drop policy if exists "Agreement owners and admins read private PDFs" on storage.objects;
create policy "Agreement owners and admins read private PDFs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'revela-agreements'
    and public.can_access_revela_work_with_us_pdf(name)
  );

drop policy if exists "Work With Us PDFs are private to authorized readers" on storage.objects;
create policy "Work With Us PDFs are private to authorized readers"
  on storage.objects as restrictive for all to authenticated
  using (
    bucket_id <> 'revela-agreements'
    or public.can_access_revela_work_with_us_pdf(name)
  )
  with check (
    bucket_id <> 'revela-agreements'
    or public.can_upload_revela_work_with_us_pdf(name)
  );

drop policy if exists "Applicants and admins upload agreement PDFs" on storage.objects;
create policy "Applicants and admins upload agreement PDFs"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'revela-agreements'
    and public.can_upload_revela_work_with_us_pdf(name)
  );

drop policy if exists "Applicants and admins update agreement PDFs" on storage.objects;
create policy "Applicants and admins update agreement PDFs"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'revela-agreements'
    and public.can_access_revela_work_with_us_pdf(name)
  )
  with check (
    bucket_id = 'revela-agreements'
    and public.can_upload_revela_work_with_us_pdf(name)
  );

create or replace function public.set_revela_work_with_us_pdf_path(
  p_agreement_id uuid,
  p_storage_path text,
  p_is_final boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agreement public.revela_work_with_us_agreements%rowtype;
  v_expected_path text;
begin
  select *
    into v_agreement
    from public.revela_work_with_us_agreements
   where id = p_agreement_id
   for update;
  if not found then
    raise exception 'Agreement not found';
  end if;

  if p_is_final then
    if not public.is_revela_work_with_us_admin() then
      raise exception 'Administrator access required to attach the final agreement PDF';
    end if;
    if v_agreement.administrator_signed_at is null
      or v_agreement.status not in ('accepted_by_revela', 'active') then
      raise exception 'The final PDF can only be attached after REVELA signs the agreement';
    end if;
    v_expected_path := v_agreement.applicant_user_id::text
      || '/agreements/' || v_agreement.id::text || '-final.pdf';
  else
    if v_agreement.applicant_user_id <> (select auth.uid())
      and not public.is_revela_work_with_us_admin() then
      raise exception 'Agreement owner or administrator access required';
    end if;
    v_expected_path := v_agreement.applicant_user_id::text
      || '/agreements/' || v_agreement.id::text || '.pdf';
  end if;

  if p_storage_path is distinct from v_expected_path then
    raise exception 'Invalid agreement PDF storage path';
  end if;
  if not exists (
    select 1
      from storage.objects stored_object
     where stored_object.bucket_id = 'revela-agreements'
       and stored_object.name = p_storage_path
  ) then
    raise exception 'Upload the agreement PDF before attaching its storage path';
  end if;

  if p_is_final then
    update public.revela_work_with_us_agreements
       set final_pdf_storage_path = p_storage_path
     where id = p_agreement_id
    returning * into v_agreement;
  else
    update public.revela_work_with_us_agreements
       set pdf_storage_path = p_storage_path
     where id = p_agreement_id
    returning * into v_agreement;
  end if;

  return to_jsonb(v_agreement);
end;
$$;

revoke all on function public.set_revela_work_with_us_pdf_path(uuid, text, boolean) from public, anon;
grant execute on function public.set_revela_work_with_us_pdf_path(uuid, text, boolean) to authenticated;
