create table if not exists public.revela_work_with_us_versions (
  agreement_version text primary key,
  title text not null,
  agreement_text text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.revela_work_with_us_versions (
  agreement_version,
  title,
  agreement_text,
  is_active
)
values (
  '1.0',
  'SOCIAL MEDIA MARKETING ENGAGEMENT AGREEMENT',
  $agreement$
REVELA
SOCIAL MEDIA MARKETING ENGAGEMENT AGREEMENT

1. POSITION AND APPOINTMENT

REVELA engages the Marketing Representative to manage and promote the official social media presence of REVELA, particularly its official Facebook page, with the aim of increasing brand awareness, audience engagement, app downloads and overall platform growth.

2. DUTIES AND RESPONSIBILITIES

A. SOCIAL MEDIA MANAGEMENT

- Create and manage content on the official REVELA Facebook page.
- Publish promotional posts and updates consistently.
- Engage followers and respond to relevant comments and enquiries.
- Promote REVELA and encourage potential users to download and use the application.

B. CONTENT CREATION AND PROMOTION

- Publish movie trailers, thrillers and promotional materials supplied by REVELA.
- Create at least two (2) original short promotional videos weekly.
- Develop creative promotional ideas to attract new users.
- Write engaging captions and descriptions for published content.

C. GROWTH AND REPORTING

- Work towards increasing the Facebook page's followers and engagement.
- Encourage genuine downloads and registrations on the REVELA application.
- Submit a weekly report on promotional activities, page growth, engagement and referrals.

3. MONTHLY STIPEND

The Marketing Representative shall receive a monthly stipend of ₦15,000 (Fifteen Thousand Naira Only) during the initial engagement period.

Payment shall be made monthly, subject to fulfilment of the agreed responsibilities and payment arrangements.

4. INITIAL TRIAL PERIOD

The engagement shall begin with an initial trial period of thirty (30) days.

At the end of the trial period, both parties shall review the performance, responsibilities and effectiveness of the arrangement.

REVELA reserves the right to review the stipend and working arrangement based on the company's financial position and the Marketing Representative's performance, subject to mutual agreement.

5. PERFORMANCE INCENTIVES

In addition to the monthly stipend, REVELA may introduce performance-based bonuses for outstanding marketing results.

Such incentives may be based on:

- Verified new users attracted to the application.
- Growth in Facebook followers and engagement.
- Successful promotional campaigns.
- Other measurable marketing achievements.

The specific bonus amounts and targets shall be agreed upon separately by both parties.

Performance bonuses do not constitute ownership or equity in REVELA.

6. OWNERSHIP OF SOCIAL MEDIA ACCOUNTS

- All official REVELA social media accounts and pages shall remain the property of REVELA.
- The Marketing Representative shall receive the necessary administrative access to perform her duties.
- She shall not transfer ownership, change account ownership or restrict REVELA's access.
- All passwords, account information and administrative privileges shall remain under the control of REVELA.
- Upon termination of this engagement, her administrative access shall be withdrawn.

7. OWNERSHIP OF CONTENT

All promotional videos, graphics, captions, advertisements and other materials specifically created and paid for under this engagement shall belong to REVELA, subject to applicable copyright law and any third-party rights.

The Marketing Representative agrees that REVELA may use such materials across its official platforms for promotional and commercial purposes.

Any third-party music, video clips, images or other copyrighted materials must have the necessary permissions or licences before publication.

8. CONFIDENTIALITY

The Marketing Representative shall not disclose confidential company information, business strategies, administrative credentials, user information or other non-public information belonging to REVELA without authorization.

9. TERMINATION

Either party may terminate this engagement by giving seven (7) days' written notice.

REVELA may terminate the engagement immediately in cases of serious misconduct, unauthorized access or disclosure of confidential information, fraud or deliberate misuse of company accounts.

Any stipend already earned up to the effective termination date shall be settled, subject to applicable law and agreed payment terms.

10. NATURE OF ENGAGEMENT

This agreement establishes a marketing engagement only. It does not grant the Marketing Representative ownership, partnership shares, equity or permanent entitlement to REVELA's profits or advertising revenue.

Any future change to the arrangement must be agreed upon in writing.

11. INTERIM AGREEMENT AND FUTURE REVIEW

This agreement serves as an initial engagement agreement for REVELA during its early development and operational stage.

The parties acknowledge that the agreement may be reviewed, updated or replaced by a more comprehensive agreement in the future.

Any revision shall be communicated to the Marketing Representative and shall require her acceptance where applicable.

12. ACCEPTANCE AND SIGNATURES

Both parties confirm that they have read, understood and agreed to the terms of this engagement.

The applicant must electronically sign before the agreement is considered completed.
$agreement$,
  true
)
on conflict (agreement_version) do nothing;

create unique index if not exists revela_work_with_us_one_active_version
  on public.revela_work_with_us_versions (is_active)
  where is_active;

create or replace function public.is_revela_work_with_us_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'revela_agreement_admin') = 'true',
    false
  );
$$;

create table if not exists public.revela_work_with_us_agreements (
  id uuid primary key default gen_random_uuid(),
  applicant_user_id uuid not null references auth.users (id) on delete restrict,
  full_name text not null,
  username text,
  email text not null,
  phone text not null,
  residential_address text,
  application_date date not null default current_date,
  requested_commencement_date date,
  commencement_date date,
  agreement_version text not null references public.revela_work_with_us_versions (agreement_version),
  agreement_snapshot text not null,
  signature_text text not null,
  acceptance_status text not null default 'accepted' check (acceptance_status = 'accepted'),
  accepted_at timestamptz not null default now(),
  submitted_at timestamptz not null default now(),
  pdf_storage_path text,
  final_pdf_storage_path text,
  status text not null default 'submitted'
    check (status in ('submitted', 'pending_review', 'accepted_by_revela', 'active', 'rejected', 'terminated')),
  administrator_name text,
  administrator_signature_text text,
  administrator_signed_at timestamptz,
  administrator_reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists revela_work_with_us_one_open_application
  on public.revela_work_with_us_agreements (applicant_user_id)
  where status not in ('rejected', 'terminated');

create index if not exists revela_work_with_us_submitted_at
  on public.revela_work_with_us_agreements (submitted_at desc);

create table if not exists public.revela_work_with_us_audit_events (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.revela_work_with_us_agreements (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.prevent_work_with_us_terms_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.applicant_user_id is distinct from old.applicant_user_id
    or new.full_name is distinct from old.full_name
    or new.username is distinct from old.username
    or new.email is distinct from old.email
    or new.phone is distinct from old.phone
    or new.residential_address is distinct from old.residential_address
    or new.application_date is distinct from old.application_date
    or new.requested_commencement_date is distinct from old.requested_commencement_date
    or new.agreement_version is distinct from old.agreement_version
    or new.agreement_snapshot is distinct from old.agreement_snapshot
    or new.signature_text is distinct from old.signature_text
    or new.acceptance_status is distinct from old.acceptance_status
    or new.accepted_at is distinct from old.accepted_at
    or new.submitted_at is distinct from old.submitted_at then
    raise exception 'Applicant details and accepted agreement terms are immutable';
  end if;

  if old.pdf_storage_path is not null and new.pdf_storage_path is distinct from old.pdf_storage_path then
    raise exception 'Applicant agreement PDF reference is immutable';
  end if;

  if old.final_pdf_storage_path is not null and new.final_pdf_storage_path is distinct from old.final_pdf_storage_path then
    raise exception 'Final agreement PDF reference is immutable';
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists revela_work_with_us_immutable_terms
  on public.revela_work_with_us_agreements;
create trigger revela_work_with_us_immutable_terms
  before update on public.revela_work_with_us_agreements
  for each row execute function public.prevent_work_with_us_terms_changes();

alter table public.revela_work_with_us_versions enable row level security;
alter table public.revela_work_with_us_agreements enable row level security;
alter table public.revela_work_with_us_audit_events enable row level security;

drop policy if exists "Applicants and agreement admins read agreement versions"
  on public.revela_work_with_us_versions;
create policy "Applicants and agreement admins read agreement versions"
  on public.revela_work_with_us_versions for select to authenticated
  using (is_active or public.is_revela_work_with_us_admin());

drop policy if exists "Applicants and agreement admins read agreements"
  on public.revela_work_with_us_agreements;
create policy "Applicants and agreement admins read agreements"
  on public.revela_work_with_us_agreements for select to authenticated
  using (applicant_user_id = (select auth.uid()) or public.is_revela_work_with_us_admin());

drop policy if exists "Applicants and agreement admins read audit events"
  on public.revela_work_with_us_audit_events;
create policy "Applicants and agreement admins read audit events"
  on public.revela_work_with_us_audit_events for select to authenticated
  using (
    public.is_revela_work_with_us_admin()
    or exists (
      select 1
      from public.revela_work_with_us_agreements agreement
      where agreement.id = agreement_id
        and agreement.applicant_user_id = (select auth.uid())
    )
  );

revoke all on public.revela_work_with_us_versions from anon, authenticated;
revoke all on public.revela_work_with_us_agreements from anon, authenticated;
revoke all on public.revela_work_with_us_audit_events from anon, authenticated;
grant select on public.revela_work_with_us_versions to authenticated;
grant select on public.revela_work_with_us_agreements to authenticated;
grant select on public.revela_work_with_us_audit_events to authenticated;

create or replace function public.submit_revela_work_with_us_agreement(
  p_agreement_version text,
  p_full_name text,
  p_username text,
  p_phone text,
  p_residential_address text,
  p_requested_commencement_date date,
  p_signature_text text,
  p_acceptance_checked boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_version public.revela_work_with_us_versions%rowtype;
  v_agreement public.revela_work_with_us_agreements%rowtype;
  v_email text := auth.jwt() ->> 'email';
begin
  if v_user_id is null or v_email is null then
    raise exception 'Sign in with your REVELA account before submitting an agreement';
  end if;
  if p_acceptance_checked is distinct from true then
    raise exception 'You must accept the agreement before submitting';
  end if;
  if length(btrim(coalesce(p_full_name, ''))) not between 2 and 200 then
    raise exception 'Enter your full legal name';
  end if;
  if length(btrim(coalesce(p_phone, ''))) not between 7 and 30
    or btrim(p_phone) !~ '^[+0-9() .-]+$'
    or btrim(p_phone) !~ '[0-9]' then
    raise exception 'Enter a valid phone number';
  end if;
  if coalesce(length(btrim(p_username)), 0) > 80 then
    raise exception 'Username must be 80 characters or fewer';
  end if;
  if coalesce(length(btrim(p_residential_address)), 0) > 500 then
    raise exception 'Address must be 500 characters or fewer';
  end if;
  if length(btrim(coalesce(p_signature_text, ''))) not between 2 and 200
    or lower(btrim(p_signature_text)) <> lower(btrim(p_full_name)) then
    raise exception 'Type your full legal name as your electronic signature';
  end if;

  select *
    into v_version
    from public.revela_work_with_us_versions
   where is_active
     and agreement_version = p_agreement_version
   for share;
  if not found then
    raise exception 'The displayed agreement version is no longer active. Reload and review the current agreement before signing';
  end if;

  insert into public.revela_work_with_us_agreements (
    applicant_user_id,
    full_name,
    username,
    email,
    phone,
    residential_address,
    requested_commencement_date,
    agreement_version,
    agreement_snapshot,
    signature_text,
    acceptance_status,
    accepted_at,
    submitted_at,
    status
  )
  values (
    v_user_id,
    btrim(p_full_name),
    nullif(btrim(coalesce(p_username, '')), ''),
    lower(v_email),
    btrim(p_phone),
    nullif(btrim(coalesce(p_residential_address, '')), ''),
    p_requested_commencement_date,
    v_version.agreement_version,
    v_version.agreement_text,
    btrim(p_signature_text),
    'accepted',
    now(),
    now(),
    'submitted'
  )
  returning * into v_agreement;

  insert into public.revela_work_with_us_audit_events (agreement_id, actor_user_id, event_type, details)
  values (
    v_agreement.id,
    v_user_id,
    'agreement_submitted',
    jsonb_build_object('agreement_version', v_version.agreement_version)
  );

  return to_jsonb(v_agreement);
exception
  when unique_violation then
    raise exception 'You already have an open Work With Us application';
end;
$$;

create or replace function public.review_revela_work_with_us_agreement(
  p_agreement_id uuid,
  p_decision text,
  p_administrator_name text,
  p_administrator_signature_text text default null,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agreement public.revela_work_with_us_agreements%rowtype;
begin
  if not public.is_revela_work_with_us_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_decision is null or p_decision not in ('pending_review', 'accepted', 'rejected') then
    raise exception 'Unsupported agreement decision';
  end if;

  select *
    into v_agreement
    from public.revela_work_with_us_agreements
   where id = p_agreement_id
   for update;
  if not found then
    raise exception 'Agreement not found';
  end if;
  if v_agreement.status not in ('submitted', 'pending_review') then
    raise exception 'This agreement has already been reviewed';
  end if;
  if p_decision <> 'pending_review' and length(btrim(coalesce(p_administrator_name, ''))) not between 2 and 200 then
    raise exception 'Enter the administrator name';
  end if;

  if p_decision = 'accepted' then
    if v_agreement.pdf_storage_path is null then
      raise exception 'The applicant PDF must be attached before acceptance';
    end if;
    if length(btrim(coalesce(p_administrator_signature_text, ''))) not between 2 and 200 then
      raise exception 'Enter the administrator electronic signature';
    end if;
    if lower(btrim(p_administrator_signature_text)) <> lower(btrim(p_administrator_name)) then
      raise exception 'The administrator signature must match the administrator name';
    end if;
    update public.revela_work_with_us_agreements
       set status = 'accepted_by_revela',
           administrator_name = btrim(p_administrator_name),
           administrator_signature_text = btrim(p_administrator_signature_text),
           administrator_signed_at = now(),
           administrator_reviewed_at = now(),
           rejection_reason = null
     where id = p_agreement_id
    returning * into v_agreement;
  elsif p_decision = 'rejected' then
    update public.revela_work_with_us_agreements
       set status = 'rejected',
           administrator_name = btrim(p_administrator_name),
           administrator_reviewed_at = now(),
           rejection_reason = nullif(btrim(coalesce(p_rejection_reason, '')), '')
     where id = p_agreement_id
    returning * into v_agreement;
  else
    update public.revela_work_with_us_agreements
       set status = 'pending_review'
     where id = p_agreement_id
    returning * into v_agreement;
  end if;

  insert into public.revela_work_with_us_audit_events (agreement_id, actor_user_id, event_type, details)
  values (
    v_agreement.id,
    auth.uid(),
    'agreement_' || p_decision,
    jsonb_build_object(
      'administrator_name', nullif(btrim(coalesce(p_administrator_name, '')), ''),
      'rejection_reason', nullif(btrim(coalesce(p_rejection_reason, '')), '')
    )
  );

  return to_jsonb(v_agreement);
end;
$$;

create or replace function public.activate_revela_work_with_us_agreement(
  p_agreement_id uuid,
  p_commencement_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agreement public.revela_work_with_us_agreements%rowtype;
begin
  if not public.is_revela_work_with_us_admin() then
    raise exception 'Administrator access required';
  end if;
  if p_commencement_date is null then
    raise exception 'Enter an agreed commencement date';
  end if;

  update public.revela_work_with_us_agreements
     set status = 'active',
         commencement_date = p_commencement_date
   where id = p_agreement_id
     and status = 'accepted_by_revela'
  returning * into v_agreement;
  if not found then
    raise exception 'Only an agreement accepted by REVELA can be activated';
  end if;

  insert into public.revela_work_with_us_audit_events (agreement_id, actor_user_id, event_type, details)
  values (
    v_agreement.id,
    auth.uid(),
    'agreement_activated',
    jsonb_build_object('commencement_date', p_commencement_date)
  );

  return to_jsonb(v_agreement);
end;
$$;

create or replace function public.terminate_revela_work_with_us_agreement(
  p_agreement_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_agreement public.revela_work_with_us_agreements%rowtype;
begin
  if not public.is_revela_work_with_us_admin() then
    raise exception 'Administrator access required';
  end if;

  update public.revela_work_with_us_agreements
     set status = 'terminated'
   where id = p_agreement_id
     and status = 'active'
  returning * into v_agreement;
  if not found then
    raise exception 'Only an active agreement can be terminated';
  end if;

  insert into public.revela_work_with_us_audit_events (agreement_id, actor_user_id, event_type, details)
  values (
    v_agreement.id,
    auth.uid(),
    'agreement_terminated',
    jsonb_build_object('reason', nullif(btrim(coalesce(p_reason, '')), ''))
  );

  return to_jsonb(v_agreement);
end;
$$;

revoke all on function public.is_revela_work_with_us_admin() from public, anon;
revoke all on function public.submit_revela_work_with_us_agreement(text, text, text, text, text, date, text, boolean) from public, anon;
revoke all on function public.review_revela_work_with_us_agreement(uuid, text, text, text, text) from public, anon;
revoke all on function public.activate_revela_work_with_us_agreement(uuid, date) from public, anon;
revoke all on function public.terminate_revela_work_with_us_agreement(uuid, text) from public, anon;
grant execute on function public.is_revela_work_with_us_admin() to authenticated;
grant execute on function public.submit_revela_work_with_us_agreement(text, text, text, text, text, date, text, boolean) to authenticated;
grant execute on function public.review_revela_work_with_us_agreement(uuid, text, text, text, text) to authenticated;
grant execute on function public.activate_revela_work_with_us_agreement(uuid, date) to authenticated;
grant execute on function public.terminate_revela_work_with_us_agreement(uuid, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'revela-agreements',
  'revela-agreements',
  false,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = array['application/pdf'];

drop policy if exists "Agreement owners and admins read private PDFs" on storage.objects;
create policy "Agreement owners and admins read private PDFs"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'revela-agreements'
    and (
      public.is_revela_work_with_us_admin()
      or (storage.foldername(name))[1] = (select auth.uid())::text
    )
  );

drop policy if exists "Work With Us PDFs are private to authorized readers" on storage.objects;
create policy "Work With Us PDFs are private to authorized readers"
  on storage.objects as restrictive for all to authenticated
  using (
    bucket_id <> 'revela-agreements'
    or public.is_revela_work_with_us_admin()
    or (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (bucket_id <> 'revela-agreements');

drop policy if exists "Work With Us PDFs are unavailable to anonymous clients" on storage.objects;
create policy "Work With Us PDFs are unavailable to anonymous clients"
  on storage.objects as restrictive for all to anon
  using (bucket_id <> 'revela-agreements')
  with check (bucket_id <> 'revela-agreements');

drop policy if exists "Work With Us PDFs cannot be deleted by clients" on storage.objects;
create policy "Work With Us PDFs cannot be deleted by clients"
  on storage.objects as restrictive for delete to authenticated
  using (bucket_id <> 'revela-agreements');
