
import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import "./SocialFeatures.css";

type Comment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type Props = {
  videoId: string;
};

export default function VideoSocialFeatures({ videoId }: Props) {
  const [userId, setUserId] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const loadSocialData = useCallback(async () => {
    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      setUserId(user?.id ?? null);

      const { count, error: likesError } = await supabase
        .from("video_likes")
        .select("*", { count: "exact", head: true })
        .eq("video_id", videoId);

      if (likesError) throw likesError;
      setLikeCount(count ?? 0);

      if (user) {
        const { data: myLike, error: myLikeError } = await supabase
          .from("video_likes")
          .select("id")
          .eq("video_id", videoId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (myLikeError) throw myLikeError;
        setLiked(Boolean(myLike));
      } else {
        setLiked(false);
      }

      const { data: commentData, error: commentsError } = await supabase
        .from("video_comments")
        .select("id, user_id, content, created_at")
        .eq("video_id", videoId)
        .order("created_at", { ascending: false });

      if (commentsError) throw commentsError;
      setComments(commentData ?? []);
    } catch (error) {
      console.error("Could not load video social features:", error);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void loadSocialData();
  }, [loadSocialData]);

  const toggleLike = async () => {
    if (!userId) {
      alert("Please sign in to like this video.");
      return;
    }

    try {
      if (liked) {
        const { error } = await supabase
          .from("video_likes")
          .delete()
          .eq("video_id", videoId)
          .eq("user_id", userId);

        if (error) throw error;

        setLiked(false);
        setLikeCount((count) => Math.max(0, count - 1));
      } else {
        const { error } = await supabase
          .from("video_likes")
          .insert({ video_id: videoId, user_id: userId });

        if (error) throw error;

        setLiked(true);
        setLikeCount((count) => count + 1);
      }
    } catch (error) {
      console.error("Could not update like:", error);
      alert("Could not update your like. Please try again.");
      void loadSocialData();
    }
  };

  const postComment = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const content = commentText.trim();

    if (!content) return;

    if (!userId) {
      alert("Please sign in to comment.");
      return;
    }

    setPosting(true);

    try {
      const { error } = await supabase.from("video_comments").insert({
        video_id: videoId,
        user_id: userId,
        content,
      });

      if (error) throw error;

      setCommentText("");
      await loadSocialData();
    } catch (error) {
      console.error("Could not post comment:", error);
      alert("Your comment could not be posted. Please try again.");
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
    <section className="video-social-panel">
      <div className="social-actions">
        <button
          type="button"
          className={`social-action ${liked ? "is-liked" : ""}`}
          onClick={toggleLike}
          aria-pressed={liked}
        >
          {liked ? "♥ Liked" : "♡ Like"} ({likeCount})
        </button>

        <button
          type="button"
          className="social-action"
          onClick={() =>
            document.getElementById("video-comments")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
        >
          💬 Comments ({comments.length})
        </button>

        <button
          type="button"
          className="social-action"
          onClick={shareVideo}
        >
          ↗ Share
        </button>
      </div>

      <div id="video-comments" className="video-comments">
        <h3>Comments</h3>

        <form onSubmit={postComment} className="comment-form">
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            placeholder={
              userId
                ? "Write a comment..."
                : "Sign in to join the conversation..."
            }
            maxLength={1000}
            rows={3}
            aria-label="Write a comment"
          />

          <button
            type="submit"
            disabled={posting || !commentText.trim()}
          >
            {posting ? "Posting..." : "Post Comment"}
          </button>
        </form>

        {loading ? (
          <p className="social-message">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="social-message">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          <div className="comment-list">
            {comments.map((comment) => (
              <article className="comment-item" key={comment.id}>
                <div className="comment-avatar">👤</div>
                <div className="comment-body">
                  <p className="comment-author">
                    Viewer
                    <span>
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </p>
                  <p className="comment-content">{comment.content}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}