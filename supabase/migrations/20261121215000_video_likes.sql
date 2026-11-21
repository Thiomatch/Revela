create table if not exists public.revela_video_likes (
  video_id text primary key check (length(btrim(video_id)) between 1 and 512),
  like_count bigint not null default 0 check (like_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.revela_video_likes enable row level security;

drop policy if exists "Anyone can read video like counts" on public.revela_video_likes;
create policy "Anyone can read video like counts"
  on public.revela_video_likes
  for select
  to anon, authenticated
  using (true);

revoke all on table public.revela_video_likes from public, anon, authenticated;
grant select on table public.revela_video_likes to anon, authenticated;

create or replace function public.increment_revela_video_like(p_video_id text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_like_count bigint;
begin
  if p_video_id is null or length(btrim(p_video_id)) not between 1 and 512 then
    raise exception 'A valid video ID is required';
  end if;

  insert into public.revela_video_likes as likes (video_id, like_count, updated_at)
  values (btrim(p_video_id), 1, now())
  on conflict (video_id) do update
    set like_count = likes.like_count + 1,
        updated_at = now()
  returning like_count into v_like_count;

  return v_like_count;
end;
$$;

revoke all on function public.increment_revela_video_like(text) from public;
grant execute on function public.increment_revela_video_like(text) to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'revela_video_likes'
    ) then
    alter publication supabase_realtime add table public.revela_video_likes;
  end if;
end;
$$;
