import { supabase } from './supabaseClient';

const videoLikesTable = 'revela_video_likes';

export async function getVideoLikeCount(videoId: string): Promise<number> {
  const { data, error } = await supabase
    .from(videoLikesTable)
    .select('like_count')
    .eq('video_id', videoId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.like_count ?? 0;
}

export async function incrementVideoLike(videoId: string): Promise<number> {
  const { data, error } = await supabase.rpc('increment_revela_video_like', {
    p_video_id: videoId,
  });
  if (error) throw new Error(error.message);
  if (typeof data !== 'number') throw new Error('The updated video like count was not returned.');
  return data;
}

export function subscribeToVideoLikeCount(
  videoId: string,
  onCount: (count: number) => void,
): () => void {
  const channel = supabase
    .channel(`video-likes:${videoId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: videoLikesTable,
        filter: `video_id=eq.${videoId}`,
      },
      (payload) => {
        if ('like_count' in payload.new) {
          const count = Number(payload.new.like_count);
          if (Number.isSafeInteger(count) && count >= 0) onCount(count);
        }
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
