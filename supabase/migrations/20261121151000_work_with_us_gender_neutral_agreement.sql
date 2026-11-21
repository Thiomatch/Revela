update public.revela_work_with_us_versions
set agreement_text = replace(
  replace(
    replace(
      replace(
        agreement_text,
        'perform her duties',
        'perform their duties'
      ),
      '- She shall not transfer ownership, change account ownership or restrict REVELA''s access.',
      '- The Marketing Representative shall not transfer ownership, change account ownership or restrict REVELA''s access.'
    ),
    'her administrative access shall be withdrawn',
    'the Marketing Representative''s administrative access shall be withdrawn'
  ),
  'shall require her acceptance where applicable.',
  'shall require the Marketing Representative''s acceptance where applicable.'
)
where is_active
  and (
    agreement_text like '%perform her duties%'
    or agreement_text like '%- She shall not transfer%'
    or agreement_text like '%her administrative access shall be withdrawn%'
    or agreement_text like '%shall require her acceptance%'
  );
