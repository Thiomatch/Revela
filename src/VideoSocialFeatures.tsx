import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./SocialFeatures.css";

type Comment = {
  id: string;
  user_name: string;
  user_avatar?: string;
  content: string;
  created_at: string;
};

type Props = {
  videoId: string;
  onOpenEpisodes?: () => void;
  onRequireRegistration?: (actionType?: string) => void;
};

export default function VideoSocialFeatures({ videoId, onOpenEpisodes, onRequireRegistration }: Props) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showCommentsOverlay, setShowCommentsOverlay] = useState(false);

  const episodeNum = Number(videoId);
  const videoKey = `shadows-episode-${episodeNum}`;

  const getRegisteredUser = () => {
    try {
      const data = localStorage.getItem("revela_registered_user");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  };

  const currentUser = getRegisteredUser();

  const loadSocialData = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }

    // 1. Fetch Comments
    try {
      const { data: commentData, error: commentsError } = await supabase
        .from("video_comments")
        .select("*")
        .or(`video_id.eq.${videoKey},video_id.eq.${videoId}`)
        .order("created_at", { ascending: false });

      if (commentsError) {
        console.error("Comments query error:", commentsError);
      } else {
        const formattedComments = (commentData ?? []).map((c: any) => ({
          ...c,
          content: c.content || c.comment || ""
        }));
        setComments(formattedComments);
      }
    } catch (err) {
      console.error("Failed to load comments:", err);
    }

    // 2. Fetch Likes
    try {
      const { count, error: likesError } = await supabase
        .from("video_likes")
        .select("*", { count: "exact", head: true })
        .eq("video_id", videoKey);

      if (!likesError) {
        setLikeCount(count ?? 0);
      }

      if (currentUser && currentUser.Email) {
        const { data: myLike } = await supabase
          .from("video_likes")
          .select("id")
          .eq("video_id", videoKey)
          .maybeSingle();

        setLiked(Boolean(myLike));
      }
    } catch (err) {
      console.warn("Likes loading skipped or failed:", err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [videoKey, videoId, currentUser]);

  useEffect(() => {
    void loadSocialData(true);
  }, [loadSocialData]);

  const toggleLike = async () => {
    try {
      if (liked) {
        const { error } = await supabase
          .from("video_likes")
          .delete()
          .eq("video_id", videoKey);

        if (error) throw error;

        setLiked(false);
        setLikeCount((count) => Math.max(0, count - 1));
      } else {
        const { error } = await supabase
          .from("video_likes")
          .insert({ video_id: videoKey });

        if (error) throw error;

        setLiked(true);
        setLikeCount((count) => count + 1);
      }
    } catch (error) {
      console.error("Could not update like:", error);
      void loadSocialData(false);
    }
  };

  const handleCommentClick = () => {
    setShowCommentsOverlay((prev) => !prev);
    void loadSocialData(false);
  };

  const postComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const contentText = commentText.trim();
    if (!contentText) return;

    if (!currentUser) {
      if (onRequireRegistration) onRequireRegistration("COMMENT");
      return;
    }

    setPosting(true);

    try {
      let localUserId = localStorage.getItem("revela_user_id");
      if (!localUserId) {
        localUserId = crypto.randomUUID();
        localStorage.setItem("revela_user_id", localUserId);
      }

      const payload: any = {
        video_id: videoKey,
        user_id: localUserId,
        user_name: currentUser.Name || "Viewer",
        user_avatar: currentUser.Avatar || "",
        content: contentText,
      };

      const { data, error } = await supabase.from("video_comments").insert(payload).select();

      if (error) {
        console.error("Supabase comment insert error details:", error);
        alert(`Failed to post comment: ${error.message}`);
        throw error;
      }

      console.log("Comment posted successfully:", data);
      setCommentText("");
      await loadSocialData(false);
    } catch (error) {
      console.error("Could not post comment:", error);
    } finally {
      setPosting(false);
    }
  };

  const shareVideo = async () => {
    const shareUrl = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Watch Shadows on Revela",
          text: "Watch this episode on Revela!",
          url: shareUrl,
        });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        alert("Page link copied. You can now share it.");
      } else {
        window.prompt("Copy this link to share:", shareUrl);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        alert("Unable to share right now. Please try again.");
      }
    }
  };

  return (
    <>
      {/* Floating Vertical Actions on Middle Right of Video */}
      <div className="video-social-overlay">
        
        {/* Episode Menu Button */}
        <button
          type="button"
          className="video-overlay-action"
          onClick={onOpenEpisodes}
          title="Episodes"
        >
          <svg viewBox="0 0 24 24"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          <span className="video-overlay-count">Ep</span>
        </button>

        {/* Like Button */}
        <button
          type="button"
          className={`video-overlay-action ${liked ? "is-liked" : ""}`}
          onClick={toggleLike}
          aria-pressed={liked}
          title="Like"
        >
          <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          <span className="video-overlay-count">{likeCount}</span>
        </button>

        {/* Comments Button */}
        <button
          type="button"
          className="video-overlay-action"
          onClick={handleCommentClick}
          title="Comments"
        >
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <span className="video-overlay-count">{comments.length}</span>
        </button>

        {/* Share Button */}
        <button
          type="button"
          className="video-overlay-action"
          onClick={shareVideo}
          title="Share"
        >
          <svg viewBox="0 0 24 24"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        </button>
      </div>

      {/* Translucent Comments Panel Overlay with Tap-Outside-to-Close */}
      {showCommentsOverlay && (
        <div 
          className="video-comments-modal-backdrop"
          onClick={() => setShowCommentsOverlay(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end'
          }}
        >
          <div 
            className="video-social-panel video-comments-overlay" 
            id="video-comments"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#121212',
              width: '100%',
              maxHeight: '75vh',
              height: '75vh',
              borderTopLeftRadius: '20px',
              borderTopRightRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 -10px 25px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}
          >
            <div className="video-comments" style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', boxSizing: 'border-box' }}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>
                  Comments <span>({comments.length})</span>
                </h3>
                <button 
                  onClick={() => setShowCommentsOverlay(false)}
                  style={{ background: 'transparent', border: 'none', color: '#aaa', fontSize: '18px', cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>

              {/* Comments List Fills Middle Space */}
              {loading ? (
                <p className="comments-empty" style={{ color: '#aaa', textAlign: 'center', margin: 'auto' }}>Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="comments-empty" style={{ color: '#aaa', textAlign: 'center', margin: 'auto' }}>
                  No comments yet. Be the first to comment!
                </p>
              ) : (
                <div className="video-comment-list" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px', marginBottom: '12px' }}>
                  {comments.map((comment) => (
                    <article className="video-comment" key={comment.id} style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                      <div className="comment-avatar" style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#333', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '14px', fontWeight: 'bold', overflow: 'hidden' }}>
                        {comment.user_avatar ? (
                          <img
                            src={comment.user_avatar}
                            alt={comment.user_name}
                            style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }}
                          />
                        ) : (
                          comment.user_name ? comment.user_name.charAt(0).toUpperCase() : "V"
                        )}
                      </div>
                      <div className="comment-content" style={{ flex: 1 }}>
                        <div className="comment-meta" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px', color: '#aaa' }}>
                          <strong style={{ color: '#fff' }}>{comment.user_name || "Viewer"}</strong>
                          <time>{new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                        </div>
                        <p style={{ margin: 0, color: '#ddd', fontSize: '14px', wordBreak: 'break-word' }}>{comment.content}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {/* Typing Box Anchored at the Bottom */}
              <form onSubmit={postComment} className="video-comment-form" style={{ marginTop: 'auto', borderTop: '1px solid #222', paddingTop: '10px' }}>
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment..."
                  maxLength={1000}
                  rows={2}
                  aria-label="Write a comment"
                  style={{ width: '100%', background: '#1e1e1e', border: '1px solid #333', borderRadius: '8px', padding: '10px', color: '#fff', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />

                <div className="comment-form-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                  <span style={{ fontSize: '11px', color: '#777' }}>{commentText.length}/1000</span>
                  <button
                    type="submit"
                    disabled={posting || !commentText.trim()}
                    style={{ background: posting || !commentText.trim() ? '#444' : '#e50914', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 14px', fontSize: '12px', fontWeight: 'bold', cursor: posting || !commentText.trim() ? 'not-allowed' : 'pointer' }}
                  >
                    {posting ? "Posting..." : "Post comment"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
