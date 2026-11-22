create table if not exists public.revela_video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id text not null,
  user_id uuid,
  author_name text not null,
  comment_text text not null,
  created_at timestamptz not null default now(),
  constraint revela_video_comments_author_name_not_empty
    check (length(btrim(author_name)) between 1 and 120),
  constraint revela_video_comments_text_not_empty
    check (length(btrim(comment_text)) between 1 and 2000)
);

create index if not exists revela_video_comments_video_created_at
  on public.revela_video_comments (video_id, created_at);

alter table public.revela_video_comments enable row level security;

drop policy if exists "Anyone can read video comments" on public.revela_video_comments;
create policy "Anyone can read video comments"
  on public.revela_video_comments
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Authenticated users can add video comments" on public.revela_video_comments;
drop policy if exists "Anyone can add video comments" on public.revela_video_comments;
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

revoke all on table public.revela_video_comments from public, anon, authenticated;
grant select on table public.revela_video_comments to anon, authenticated;
grant insert on table public.revela_video_comments to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'revela_video_comments'
    ) then
    alter publication supabase_realtime add table public.revela_video_comments;
  end if;
end;
$$;

NOTIFY pgrst, 'reload schema';
