import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import  supabase  from "../supabaseClient";

export default function LeaderPage() {
  const { id } = useParams(); // Leader ID from URL
  const [leader, setLeader] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyText, setReplyText] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLeader, setIsLeader] = useState(false);

  useEffect(() => {
    fetchLeader();
    fetchComments();
    checkUser();
  }, [id]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    if (user) {
      // Check if logged-in user is this leader
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_leader, leader_id")
        .eq("id", user.id)
        .single();
      if (profile && profile.is_leader && profile.leader_id === parseInt(id)) {
        setIsLeader(true);
      }
    }
  };

  const fetchLeader = async () => {
    const { data, error } = await supabase
      .from("leaders")
      .select("*")
      .eq("id", id)
      .single();
    if (error) {
      console.error("Error fetching leader:", error);
    } else {
      setLeader(data);
    }
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("ratings")
      .select("id, comment, created_at, parent_id, user_id, profiles(name, avatar_url)")
      .eq("leader_id", id)
      .order("created_at", { ascending: true });
    if (!error) {
      const nested = data.filter(c => !c.parent_id)
        .map(c => ({
          ...c,
          replies: data.filter(r => r.parent_id === c.id)
        }));
      setComments(nested);
    }
    setLoading(false);
  };

  const postComment = async () => {
    if (!newComment.trim()) return;
    const { error } = await supabase.from("ratings").insert([{
      leader_id: id,
      comment: newComment,
      user_id: currentUser?.id,
      parent_id: null
    }]);
    if (!error) {
      setNewComment("");
      fetchComments();
    }
  };

  const postReply = async (parentId) => {
    if (!replyText[parentId]?.trim()) return;
    const { error } = await supabase.from("ratings").insert([{
      leader_id: id,
      comment: replyText[parentId],
      user_id: currentUser?.id,
      parent_id: parentId
    }]);
    if (!error) {
      setReplyText({ ...replyText, [parentId]: "" });
      fetchComments();
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div style={styles.container}>
      {leader && (
        <div style={styles.header}>
          <img src={leader.photo_url || "https://via.placeholder.com/150"} alt="Leader" style={styles.profilePhoto} />
          <h2 style={styles.leaderName}>{leader.name}</h2>
          <p style={styles.position}>{leader.position}</p>
        </div>
      )}

    
    {/* Back Button */}
    <button
      onClick={() => window.location.href = "/dashboard"}
      style={{
        backgroundColor: "#007BFF",
        color: "white",
        border: "none",
        padding: "10px 16px",
        borderRadius: "6px",
        cursor: "pointer",
        marginBottom: "15px",
        fontWeight: "bold"
      }}
    >
      ← Back to Dashboard
    </button>

      <div style={styles.mainContent}>
        {/* Left column: Bio & Manifesto */}
        <div style={styles.leftColumn}>
          <div style={styles.card}>
            <h3>Bio</h3>
            <p>{leader?.bio || "No bio available"}</p>
          </div>
          <div style={styles.card}>
            <h3>Manifesto</h3>
            <p>{leader?.manifesto || "No manifesto available"}</p>
          </div>
        </div>

        {/* Right column: Comments */}
        <div style={styles.rightColumn}>
          <div style={styles.commentBox}>
            <textarea
              style={styles.textarea}
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button style={styles.button} onClick={postComment}>Post</button>
          </div>

          {comments.map(comment => (
            <div key={comment.id} style={styles.commentCard}>
              <div style={styles.commentHeader}>
                <img
                  src={comment.profiles?.avatar_url || "https://via.placeholder.com/40"}
                  alt="User"
                  style={styles.commentAvatar}
                />
                <strong>{comment.profiles?.name || "Anonymous"}</strong>
              </div>
              <p>{comment.comment}</p>
              <small>{new Date(comment.created_at).toLocaleString()}</small>

              {isLeader && (
                <div>
                  <textarea
                    style={styles.replyBox}
                    placeholder="Write a reply..."
                    value={replyText[comment.id] || ""}
                    onChange={(e) => setReplyText({ ...replyText, [comment.id]: e.target.value })}
                  />
                  <button style={styles.replyButton} onClick={() => postReply(comment.id)}>Reply</button>
                </div>
              )}

              {comment.replies.length > 0 && (
                <div style={styles.replySection}>
                  {comment.replies.map(reply => (
                    <div key={reply.id} style={styles.replyCard}>
                      <div style={styles.commentHeader}>
                        <img
                          src={reply.profiles?.avatar_url || "https://via.placeholder.com/30"}
                          alt="User"
                          style={styles.commentAvatarSmall}
                        />
                        <strong>{reply.profiles?.name || "Anonymous"}</strong>
                      </div>
                      <p>{reply.comment}</p>
                      <small>{new Date(reply.created_at).toLocaleString()}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: 32,
    maxWidth: 1000,
    margin: "40px auto",
    background: "#f4f6fb",
    borderRadius: 16,
    boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
    background: "linear-gradient(90deg, #e3f0ff 0%, #f9f9f9 100%)",
    padding: "32px 0 24px 0",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  profilePhoto: {
    width: 120,
    height: 120,
    borderRadius: "50%",
    objectFit: "cover",
    border: "4px solid #e3f0ff",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  leaderName: {
    fontSize: 28,
    margin: "18px 0 8px 0",
    fontWeight: 700,
    color: "#1a2a4b",
    letterSpacing: 1,
  },
  position: {
    fontSize: 18,
    color: "#4e5d78",
    fontWeight: 500,
    marginBottom: 0,
  },
  mainContent: {
    display: "flex",
    gap: 32,
    flexWrap: "wrap",
    alignItems: "flex-start",
  },
  leftColumn: {
    flex: 1,
    minWidth: 280,
  },
  rightColumn: {
    flex: 2,
    minWidth: 340,
  },
  card: {
    background: "#fff",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
    marginBottom: 20,
    borderLeft: "4px solid #e3f0ff",
  },
  commentBox: {
    marginBottom: 24,
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
  },
  textarea: {
    width: "100%",
    minHeight: 60,
    padding: 12,
    borderRadius: 7,
    border: "1px solid #dbeafe",
    fontSize: 16,
    marginBottom: 8,
    resize: "vertical",
    background: "#f7fbff",
    transition: "border 0.2s",
  },
  button: {
    padding: "10px 20px",
    background: "linear-gradient(90deg, #1877f2 0%, #42b72a 100%)",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    cursor: "pointer",
    fontWeight: 600,
    fontSize: 16,
    boxShadow: "0 1px 4px rgba(24,119,242,0.08)",
    transition: "background 0.2s",
  },
  commentCard: {
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
    marginBottom: 16,
    borderLeft: "3px solid #dbeafe",
    transition: "box-shadow 0.2s",
  },
  commentHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 6,
  },
  commentAvatar: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "2px solid #e3f0ff",
    objectFit: "cover",
  },
  commentAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "2px solid #e3f0ff",
    objectFit: "cover",
  },
  replyBox: {
    width: "100%",
    minHeight: 40,
    padding: 10,
    marginTop: 8,
    border: "1px solid #dbeafe",
    borderRadius: 7,
    background: "#f7fbff",
    fontSize: 15,
    resize: "vertical",
  },
  replyButton: {
    marginTop: 6,
    padding: "8px 16px",
    background: "#42b72a",
    color: "#fff",
    border: "none",
    borderRadius: 7,
    cursor: "pointer",
    fontWeight: 500,
    fontSize: 15,
    boxShadow: "0 1px 4px rgba(66,183,42,0.08)",
    transition: "background 0.2s",
  },
  replySection: {
    marginTop: 12,
    marginLeft: 24,
    borderLeft: "2px solid #e3f0ff",
    paddingLeft: 12,
  },
  replyCard: {
    background: "#f7fbff",
    padding: 10,
    borderRadius: 7,
    marginTop: 7,
    boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
  },
};
