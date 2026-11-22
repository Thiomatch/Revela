drop policy if exists "Authenticated users can add video comments"
  on public.revela_video_comments;
drop policy if exists "Anyone can add video comments"
  on public.revela_video_comments;

create policy "Anyone can add video comments"
  on public.revela_video_comments
  for insert
  to anon, authenticated
  with check (
    (
      auth.role() = 'anon'
      and user_id is null
    )
    or (
      auth.role() = 'authenticated'
      and user_id = auth.uid()
    )
  )
  and length(btrim(author_name)) between 1 and 120
  and length(btrim(comment_text)) between 1 and 2000
  );

grant insert on table public.revela_video_comments to anon, authenticated;

NOTIFY pgrst, 'reload schema';
