import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

export default function LeaderPage() {
  const { id } = useParams(); // leader id (uuid)
  const navigate = useNavigate();

  // Leader + auth/user
  const [leader, setLeader] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Ratings
  const [avgRating, setAvgRating] = useState(0);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Discussion
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState(""); // ✨ defined now
  const [replyText, setReplyText] = useState({});   // { [commentId]: "text" }
  const [openReplyFor, setOpenReplyFor] = useState(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [submittingReplyId, setSubmittingReplyId] = useState(null);

  const [loading, setLoading] = useState(true);

  // -------- Load everything (user -> leader & comments/reviews) ----------
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      // 1) user
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user || null;
      if (!cancelled) setCurrentUser(user);

      // 2) leader
      const { data: leaderData } = await supabase
        .from("leaders")
        .select("*")
        .eq("id", id)
        .single();

      if (!cancelled) setLeader(leaderData || null);

      // 3) comments (reviews + discussion)
      await refreshCommentsAndRatings(user);

      if (!cancelled) setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const refreshCommentsAndRatings = async (user) => {
    const { data, error } = await supabase
      .from("comments")
      .select(
        `
        id, comment, created_at, parent_id, user_id, rating, type,
        profiles(first_name, photo_url)
      `
      )
      .eq("leader_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching comments:", error);
      return;
    }

    // split
    const reviews = data.filter((r) => r.type === "review");
    const discussion = data.filter((d) => d.type === "discussion");

    // avg
    const avg =
      reviews.length > 0
        ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length
        : 0;
    setAvgRating(Number(avg.toFixed(1)));

    // once-per-user-per-leader
    const hasReviewed = !!reviews.find((r) => r.user_id === user?.id);
    setUserHasReviewed(hasReviewed);

    // nest discussion threads
    const parents = discussion.filter((c) => !c.parent_id);
    const nested = parents.map((p) => ({
      ...p,
      replies: discussion.filter((r) => r.parent_id === p.id),
    }));
    setComments(nested);
  };

  // ---------------------- Rating (stars only) ---------------------------
  const handleRate = async (stars) => {
    if (!currentUser) {
      alert("You must be logged in to rate.");
      return;
    }
    if (userHasReviewed || ratingSubmitting) return;

    try {
      setRatingSubmitting(true);
      const { error } = await supabase.from("comments").insert([
        {
          leader_id: id,
          user_id: currentUser.id,
          parent_id: null,
          comment: "", // no text for reviews
          rating: stars,
          type: "review",
        },
      ]);

      if (error) {
        console.error("Error submitting rating:", error);
        alert("Could not submit rating.");
      } else {
        await refreshCommentsAndRatings(currentUser);
      }
    } finally {
      setRatingSubmitting(false);
    }
  };

  // ---------------------- Discussion: new comment -----------------------
  const postComment = async () => {
    if (!currentUser) {
      alert("You must be logged in to comment.");
      return;
    }
    if (!newComment.trim() || submittingComment) return;

    try {
      setSubmittingComment(true);
      const { error } = await supabase.from("comments").insert([
        {
          leader_id: id,
          user_id: currentUser.id,
          comment: newComment.trim(),
          parent_id: null,
          type: "discussion",
          rating: null,
        },
      ]);
      if (error) {
        console.error("Error submitting comment:", error);
        alert("Could not submit comment.");
      } else {
        setNewComment("");
        await refreshCommentsAndRatings(currentUser);
      }
    } finally {
      setSubmittingComment(false);
    }
  };

  // ---------------------- Discussion: reply -----------------------------
  const postReply = async (parentId) => {
    if (!currentUser) {
      alert("You must be logged in to reply.");
      return;
    }
    const text = replyText[parentId] || "";
    if (!text.trim() || submittingReplyId) return;

    try {
      setSubmittingReplyId(parentId);
      const { error } = await supabase.from("comments").insert([
        {
          leader_id: id,
          user_id: currentUser.id,
          comment: text.trim(),
          parent_id: parentId,
          type: "discussion",
          rating: null,
        },
      ]);
      if (error) {
        console.error("Error submitting reply:", error);
        alert("Could not submit reply.");
      } else {
        setReplyText((prev) => ({ ...prev, [parentId]: "" }));
        setOpenReplyFor(null);
        await refreshCommentsAndRatings(currentUser);
      }
    } finally {
      setSubmittingReplyId(null);
    }
  };

  // ---------------------- UI helpers -----------------------------------
  const Star = ({ filled, size = 22, onClick, disabled }) => (
    <span
      onClick={disabled ? undefined : onClick}
      style={{
        fontSize: size,
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        color: filled ? "#fbbf24" : "#d7dce3",
        marginRight: 4,
      }}
    >
      ★
    </span>
  );

  const renderAvgStars = (value) => {
    const full = Math.floor(value);
    const stars = Array.from({ length: 5 }, (_, i) => i < full);
    return (
      <div style={{ display: "inline-flex", alignItems: "center" }}>
        {stars.map((f, i) => (
          <Star key={i} filled={f} size={18} disabled />
        ))}
        <span style={{ marginLeft: 8, color: "#334155" }}>{value || 0}/5</span>
      </div>
    );
  };

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={styles.page}>
      {/* Sticky top bar */}
      <div style={styles.topbar}>
        <button onClick={() => navigate("/dashboard")} style={styles.backBtn}>
          ← Back to Dashboard
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontWeight: 600, color: "#0f172a" }}>Average:</span>
          {renderAvgStars(avgRating)}
        </div>
      </div>

      {/* Leader header */}
      {leader && (
        <div style={styles.header}>
          <img
            src={
              leader.photo_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                leader.name || "Leader"
              )}&background=random`
            }
            alt={leader.name}
            style={styles.leaderAvatar}
          />
          <div>
            <h2 style={styles.leaderName}>{leader.name}</h2>
            <p style={styles.leaderPos}>{leader.position}</p>
          </div>
        </div>
      )}

      {/* Rating card (stars only) */}
      <div style={styles.card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Rate this leader</h3>
          <small style={{ color: "#64748b" }}>
            (one rating per user • no text)
          </small>
        </div>

        <div style={{ marginTop: 10 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              filled={false}
              size={28}
              disabled={userHasReviewed || ratingSubmitting}
              onClick={() => handleRate(n)}
            />
          ))}
        </div>

        {userHasReviewed && (
          <p style={{ marginTop: 8, color: "#16a34a", fontWeight: 600 }}>
            You’ve already rated this leader.
          </p>
        )}
      </div>

      {/* Discussion: new top-level comment */}
      <div style={styles.card}>
        <h3 style={{ marginTop: 0 }}>Public Discussion</h3>
        <div style={styles.commentBox}>
          <textarea
            style={styles.textarea}
            placeholder="Write a public comment…"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button
            style={styles.primaryBtn}
            onClick={postComment}
            disabled={submittingComment}
          >
            {submittingComment ? "Posting…" : "Post Comment"}
          </button>
        </div>

        {/* Threaded comments */}
        {comments.map((c) => (
          <div key={c.id} style={styles.commentCard}>
            <div style={styles.commentHead}>
              <img
                src={
                  c.profiles?.avatar_url ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    c.profiles?.name || "User"
                  )}&background=random`
                }
                alt={c.profiles?.name || "User"}
                style={styles.commentAvatar}
              />
              <div>
                <div style={{ fontWeight: 600 }}>
                  {c.profiles?.name || "Anonymous"}
                </div>
                <small style={{ color: "#64748b" }}>
                  {new Date(c.created_at).toLocaleString()}
                </small>
              </div>
            </div>

            <p style={{ margin: "8px 0 0 0" }}>{c.comment}</p>

            {/* Reply action */}
            <div style={{ marginTop: 8 }}>
              <button
                onClick={() =>
                  setOpenReplyFor((prev) => (prev === c.id ? null : c.id))
                }
                style={styles.linkBtn}
              >
                {openReplyFor === c.id ? "Cancel" : "Reply"}
              </button>
            </div>

            {/* Reply box (toggles) */}
            {openReplyFor === c.id && (
              <div style={{ marginTop: 8 }}>
                <textarea
                  style={styles.replyTextarea}
                  placeholder="Write a reply…"
                  value={replyText[c.id] || ""}
                  onChange={(e) =>
                    setReplyText((prev) => ({ ...prev, [c.id]: e.target.value }))
                  }
                />
                <button
                  style={styles.replyBtn}
                  onClick={() => postReply(c.id)}
                  disabled={submittingReplyId === c.id}
                >
                  {submittingReplyId === c.id ? "Replying…" : "Reply"}
                </button>
              </div>
            )}

            {/* Replies */}
            {c.replies?.length > 0 && (
              <div style={styles.replies}>
                {c.replies.map((r) => (
                  <div key={r.id} style={styles.replyCard}>
                    <div style={styles.replyHead}>
                      <img
                        src={
                          r.profiles?.avatar_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(
                            r.profiles?.name || "User"
                          )}&background=random`
                        }
                        alt={r.profiles?.name || "User"}
                        style={styles.replyAvatar}
                      />
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {r.profiles?.name || "Anonymous"}
                        </div>
                        <small style={{ color: "#64748b" }}>
                          {new Date(r.created_at).toLocaleString()}
                        </small>
                      </div>
                    </div>
                    <p style={{ margin: "6px 0 0 0" }}>{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --------------------------- styles ------------------------------------
const styles = {
  page: {
    maxWidth: 980,
    margin: "0 auto",
    padding: "16px 16px 60px",
    fontFamily: "Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  topbar: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: "#ffffffcc",
    backdropFilter: "saturate(180%) blur(6px)",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    marginBottom: 14,
  },
  backBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  leaderAvatar: {
    width: 84,
    height: 84,
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #e5e7eb",
  },
  leaderName: { margin: 0, fontSize: 24, color: "#0f172a" },
  leaderPos: { margin: 0, color: "#475569" },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  commentBox: { display: "grid", gap: 8 },
  textarea: {
    width: "100%",
    minHeight: 72,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    padding: 10,
    outline: "none",
  },
  primaryBtn: {
    justifySelf: "start",
    background: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "8px 14px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },

  commentCard: {
    padding: 12,
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    marginTop: 12,
  },
  commentHead: { display: "flex", alignItems: "center", gap: 10 },
  commentAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #e5e7eb",
  },
  linkBtn: {
    background: "transparent",
    border: "none",
    color: "#2563eb",
    cursor: "pointer",
    padding: 0,
    fontWeight: 600,
  },

  replies: {
    marginTop: 10,
    marginLeft: 18,
    borderLeft: "2px solid #e5e7eb",
    paddingLeft: 12,
  },
  replyCard: {
    background: "#f8fafc",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  replyHead: { display: "flex", alignItems: "center", gap: 8 },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid #e5e7eb",
  },
  replyTextarea: {
    width: "100%",
    minHeight: 54,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    padding: 8,
    outline: "none",
    marginBottom: 6,
  },
  replyBtn: {
    background: "#2563eb",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 600,
  },
};
