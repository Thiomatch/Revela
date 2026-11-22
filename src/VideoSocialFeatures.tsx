import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { getVideoLikeCount, incrementVideoLike, subscribeToVideoLikeCount } from './videoLikes';
import {
  addVideoComment,
  getVideoComments,
  subscribeToVideoComments,
  type VideoComment,
} from './videoComments';
import './SocialFeatures.css';

type VideoSocialFeaturesProps = {
  videoId: string;
  onOpenEpisodes: () => void;
};

export default function VideoSocialFeatures({
  videoId,
  onOpenEpisodes,
}: VideoSocialFeaturesProps) {
  const [likesCount, setLikesCount] = useState<number>(0);
  const [pendingLikes, setPendingLikes] = useState(0);
  const [likesLoading, setLikesLoading] = useState(true);
  const [likeError, setLikeError] = useState('');
  const [showPlusOne, setShowPlusOne] = useState<boolean>(false);
  const [shareCount] = useState<number>(42);
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [showComments, setShowComments] = useState(false);
  const serverCountRef = useRef(0);
  const pendingLikesRef = useRef(0);
  const activeVideoIdRef = useRef(videoId);
  const likeQueueRef = useRef(Promise.resolve());
  const activeCommentsVideoIdRef = useRef(videoId);
  const commentsRequestIdRef = useRef(0);

  const loadComments = useCallback(async (requestedVideoId: string) => {
    const requestId = ++commentsRequestIdRef.current;
    setCommentsLoading(true);
    setCommentError('');
    try {
      const loadedComments = await getVideoComments(requestedVideoId);
      if (activeCommentsVideoIdRef.current === requestedVideoId && commentsRequestIdRef.current === requestId) {
        setComments((current) => mergeComments(current, loadedComments));
      }
    } catch (error) {
      if (activeCommentsVideoIdRef.current === requestedVideoId && commentsRequestIdRef.current === requestId) {
        setCommentError(error instanceof Error ? error.message : 'Comments could not be loaded.');
      }
    } finally {
      if (activeCommentsVideoIdRef.current === requestedVideoId && commentsRequestIdRef.current === requestId) {
        setCommentsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    activeVideoIdRef.current = videoId;
    serverCountRef.current = 0;
    pendingLikesRef.current = 0;
    setLikesCount(0);
    setPendingLikes(0);
    setLikesLoading(true);
    setLikeError('');

    const updateServerCount = (count: number) => {
      if (activeVideoIdRef.current !== videoId || pendingLikesRef.current > 0) return;
      serverCountRef.current = Math.max(serverCountRef.current, count);
      setLikesCount(serverCountRef.current + pendingLikesRef.current);
      setLikesLoading(false);
    };

    const unsubscribe = subscribeToVideoLikeCount(videoId, updateServerCount);
    void getVideoLikeCount(videoId)
      .then(updateServerCount)
      .catch((error: unknown) => {
        if (activeVideoIdRef.current === videoId) {
          setLikeError(error instanceof Error ? error.message : 'Likes could not be loaded.');
          setLikesLoading(false);
        }
      });

    return () => {
      unsubscribe();
      if (activeVideoIdRef.current === videoId) activeVideoIdRef.current = '';
    };
  }, [videoId]);

  useEffect(() => {
    activeCommentsVideoIdRef.current = videoId;
    setComments([]);
    setCommentDraft('');
    setCommentError('');
    const unsubscribe = subscribeToVideoComments(videoId, (comment) => {
      if (activeCommentsVideoIdRef.current === videoId) {
        setComments((current) => mergeComments(current, [comment]));
      }
    });
    void loadComments(videoId);

    return () => {
      unsubscribe();
      activeCommentsVideoIdRef.current = '';
      commentsRequestIdRef.current += 1;
    };
  }, [loadComments, videoId]);

  const handleLikeClick = () => {
    const requestedVideoId = videoId;
    pendingLikesRef.current += 1;
    setPendingLikes(pendingLikesRef.current);
    setLikesCount(serverCountRef.current + pendingLikesRef.current);
    setLikeError('');
    setShowPlusOne(true);

    window.setTimeout(() => setShowPlusOne(false), 1000);
    likeQueueRef.current = likeQueueRef.current.then(async () => {
      let incrementSucceeded = false;
      try {
        const count = await incrementVideoLike(requestedVideoId);
        incrementSucceeded = true;
        if (activeVideoIdRef.current === requestedVideoId) {
          serverCountRef.current = Math.max(serverCountRef.current, count);
        }
      } catch (error) {
        if (activeVideoIdRef.current === requestedVideoId) {
          setLikeError(error instanceof Error ? error.message : 'Your like could not be saved.');
        }
      } finally {
        if (activeVideoIdRef.current === requestedVideoId) {
          pendingLikesRef.current = Math.max(0, pendingLikesRef.current - 1);
          setPendingLikes(pendingLikesRef.current);
          setLikesCount(serverCountRef.current + pendingLikesRef.current);
          setLikesLoading(false);

          if (pendingLikesRef.current === 0) {
            void getVideoLikeCount(requestedVideoId)
              .then((count) => {
                if (activeVideoIdRef.current !== requestedVideoId || pendingLikesRef.current > 0) return;
                serverCountRef.current = Math.max(serverCountRef.current, count);
                setLikesCount(serverCountRef.current);
              })
              .catch((error: unknown) => {
                if (activeVideoIdRef.current === requestedVideoId) {
                  setLikeError(error instanceof Error ? error.message : 'Likes could not be refreshed.');
                }
              });
          }
          if (incrementSucceeded) setLikeError('');
        }
      }
    });
  };

  const handleShareClick = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Revela Video',
          text: 'Check out this amazing video on Revela!',
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: Copy link to clipboard
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
    }
  };

  const handleCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text || commentSubmitting) return;

    const requestedVideoId = videoId;
    setCommentSubmitting(true);
    setCommentError('');
    try {
      const comment = await addVideoComment(requestedVideoId, text);
      if (activeCommentsVideoIdRef.current === requestedVideoId) {
        setComments((current) => mergeComments(current, [comment]));
        setCommentDraft('');
      }
    } catch (error) {
      setCommentError(error instanceof Error ? error.message : 'Your comment could not be posted.');
    } finally {
      if (activeCommentsVideoIdRef.current === requestedVideoId) {
        setCommentSubmitting(false);
      }
    }
  };

  return (
    <>
    <div style={{
      position: 'absolute',
      right: '16px',
      bottom: '100px',
      zIndex: 20,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px'
    }}>
      {/* 1. EPS Button (Moved to the top) */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onOpenEpisodes();
          }}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            backdropFilter: 'blur(4px)'
          }}
          aria-label="Episodes list"
        >
          EPS
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          Series
        </span>
      </div>

      {/* 2. Repeatable, persisted video likes */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {showPlusOne && (
          <span style={{
            position: 'absolute',
            top: '-24px',
            color: '#ff3b30',
            fontWeight: 'bold',
            fontSize: '14px',
            animation: 'fadeInOut 1s ease forwards',
            textShadow: '0 1px 3px rgba(0,0,0,0.8)'
          }}>
            +1
          </span>
        )}
        <button
          type="button"
          onClick={handleLikeClick}
          aria-label={`Like video, ${likesCount} likes`}
          aria-busy={pendingLikes > 0}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: pendingLikes > 0 ? '#ff3b30' : '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '20px',
            backdropFilter: 'blur(4px)'
          }}
        >
          ♥
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {likesLoading ? '…' : likesCount}
        </span>
        {pendingLikes > 0 && (
          <span aria-live="polite" style={{ fontSize: '9px', color: '#e0e0e0' }}>
            Saving {pendingLikes}…
          </span>
        )}
        {likeError && (
          <span role="alert" style={{ maxWidth: '100px', color: '#ff6b6b', fontSize: '9px', textAlign: 'center' }}>
            {likeError}
          </span>
        )}
      </div>

      {/* 3. Comment Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowComments(true);
            void loadComments(videoId);
          }}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '18px',
            backdropFilter: 'blur(4px)'
          }}
          aria-label="Comments"
        >
          💬
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {comments.length}
        </span>
      </div>

      {/* 4. Share Button */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <button
          type="button"
          onClick={handleShareClick}
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '16px',
            backdropFilter: 'blur(4px)'
          }}
          aria-label="Share video"
        >
          🔗
        </button>
        <span style={{ fontSize: '11px', color: '#fff', marginTop: '4px', fontWeight: '600', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {shareCount}
        </span>
      </div>
    </div>
      {showComments && createPortal(
        <div
          className="video-comments-modal-backdrop"
          onClick={() => setShowComments(false)}
        >
          <section
            className="video-social-panel video-comments-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="video-comments-heading"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="video-comments">
              <div className="video-comments-heading">
                <h3 id="video-comments-heading">Comments <span>{comments.length}</span></h3>
                <button
                  type="button"
                  onClick={() => setShowComments(false)}
                  aria-label="Close comments"
                  className="video-comments-close"
                >
                  ×
                </button>
              </div>
              <div className="video-comment-list" aria-live="polite">
                {commentsLoading && comments.length === 0 ? (
                  <p className="comments-empty">Loading comments…</p>
                ) : commentError && comments.length === 0 ? (
                  <p className="video-comment-error" role="alert">{commentError}</p>
                ) : comments.length === 0 ? (
                  <p className="comments-empty">No comments yet. Be the first to comment!</p>
                ) : comments.map((comment) => (
                  <article className="video-comment" key={comment.id}>
                    <div className="comment-avatar" aria-hidden="true">
                      {comment.author_name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="comment-content">
                      <div className="comment-meta">
                        <strong>{comment.author_name}</strong>
                        <time dateTime={comment.created_at}>
                          {new Date(comment.created_at).toLocaleString()}
                        </time>
                      </div>
                      <p>{comment.comment_text}</p>
                    </div>
                  </article>
                ))}
                {commentError && <p className="video-comment-error" role="alert">{commentError}</p>}
              </div>
              <form className="video-comment-form" onSubmit={(event) => void handleCommentSubmit(event)}>
                <input
                  type="text"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="Add a comment..."
                  aria-label="Add a comment"
                  maxLength={2000}
                  disabled={commentSubmitting}
                />
                <div className="comment-form-footer">
                  <span>{commentSubmitting ? 'Posting…' : `${commentDraft.length}/2000`}</span>
                  <button type="submit" disabled={commentSubmitting || !commentDraft.trim()}>
                    {commentSubmitting ? 'Posting…' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}

function mergeComments(current: VideoComment[], incoming: VideoComment[]): VideoComment[] {
  const commentsById = new Map(current.map((comment) => [comment.id, comment]));
  for (const comment of incoming) commentsById.set(comment.id, comment);
  return [...commentsById.values()].sort((first, second) => (
    first.created_at.localeCompare(second.created_at)
  ));
}