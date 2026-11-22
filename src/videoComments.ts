import { supabase } from './supabaseClient';

const videoCommentsTable = 'revela_video_comments';

export type VideoComment = {
  id: string;
  video_id: string;
  user_id: string | null;
  author_name: string;
  comment_text: string;
  created_at: string;
};

export async function getVideoComments(videoId: string): Promise<VideoComment[]> {
  const { data, error } = await supabase
    .from(videoCommentsTable)
    .select('id, video_id, user_id, author_name, comment_text, created_at')
    .eq('video_id', videoId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as VideoComment[];
}

export async function addVideoComment(videoId: string, commentText: string): Promise<VideoComment> {
  const text = commentText.trim();
  if (!text) throw new Error('Enter a comment before posting.');

  const { data: authData, error: authError } = await supabase.auth.getSession();
  if (authError) throw new Error(authError.message);

  const user = authData.session?.user ?? null;
  const metadata = user?.user_metadata ?? {};
  const displayName = [metadata.full_name, metadata.name, metadata.display_name]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const authorName = displayName?.trim() || user?.email?.split('@')[0] || 'Guest';

  const { data, error } = await supabase
    .from(videoCommentsTable)
    .insert({
      video_id: videoId,
      user_id: user?.id ?? null,
      author_name: authorName,
      comment_text: text,
    })
    .select('id, video_id, user_id, author_name, comment_text, created_at')
    .single();
  if (error) throw new Error(error.message);
  return data as VideoComment;
}

export function subscribeToVideoComments(
  videoId: string,
  onComment: (comment: VideoComment) => void,
): () => void {
  const channel = supabase
    .channel(`video-comments:${videoId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: videoCommentsTable,
        filter: `video_id=eq.${videoId}`,
      },
      (payload) => {
        onComment(payload.new as VideoComment);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
