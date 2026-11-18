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
