
const postComment = async (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();

  const content = commentText.trim();
  if (!content || posting) return;

  setPosting(true);

  try {
    // Check the current authenticated user before posting.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      alert("Please sign in again before posting a comment.");
      return;
    }

    setUserId(user.id);

    const { error } = await supabase
      .from("video_comments")
      .insert({
        video_id: videoId,
        user_id: user.id,
        content,
      });

    if (error) throw error;

    setCommentText("");
    await loadSocialData();
  } catch (error) {
    console.error("Could not post comment:", error);

    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred.";

    alert(`Could not post comment: ${message}`);
  } finally {
    setPosting(false);
  }
};