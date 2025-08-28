import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import supabase from "../supabaseClient";

const Dashboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // ✅ Check user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const user = userData?.user;
        if (!user) {
          navigate("/login");
          return;
        }

        // ✅ Get profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (profileError) throw profileError;

        if (!profile) {
          navigate("/complete-profile");
          return;
        }

        setIsAdmin(!!profile.is_admin);

        // ✅ Fetch leaders by hierarchy
        const { data: president } = await supabase
          .from("leaders")
          .select("*")
          .eq("position", "President");

        const { data: countyLeaders } = await supabase
          .from("leaders")
          .select("*")
          .in("position", ["Governor", "Senator", "Women Rep"])
          .eq("county_id", profile.county_id);

        const { data: mp } = await supabase
          .from("leaders")
          .select("*")
          .eq("position", "MP")
          .eq("constituency_id", profile.constituency_id)
          .maybeSingle();

        const { data: mca } = await supabase
          .from("leaders")
          .select("*")
          .eq("position", "MCA")
          .eq("ward_id", profile.ward_id)
          .maybeSingle();

        const allLeaders = [
          ...(president || []),
          ...(countyLeaders || []),
          ...(mp ? [mp] : []),
          ...(mca ? [mca] : []),
        ];

        setLeaders(allLeaders);

        // ✅ Fetch average ratings for each leader
        const { data: commentsData, error: commentsError } = await supabase
          .from("comments")
          .select("leader_id, rating")
          .not("rating", "is", null);
        if (commentsError) throw commentsError;

        const avgRatings = {};
        commentsData.forEach((c) => {
          if (!avgRatings[c.leader_id]) {
            avgRatings[c.leader_id] = { sum: 0, count: 0 };
          }
          avgRatings[c.leader_id].sum += c.rating;
          avgRatings[c.leader_id].count += 1;
        });

        const calculated = {};
        for (const [leaderId, { sum, count }] of Object.entries(avgRatings)) {
          calculated[leaderId] = sum / count;
        }

        setRatings(calculated);
      } catch (err) {
        console.error("Error loading dashboard data:", err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const renderStars = (avg) => {
    if (!avg) return <span style={{ color: "#ccc" }}>No ratings yet</span>;
    return (
      <div style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            style={{
              fontSize: "20px",
              color: star <= avg ? "#fbbf24" : "#ccc",
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) return <p style={styles.loading}>Loading leaders...</p>;

  return (
    <div style={styles.wrapper}>
      {/* Sticky Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>🌍 CivicLens Dashboard</h1>
        <div style={styles.actions}>
          {isAdmin && (
            <Link to="/admin" style={styles.adminLink}>
              Admin Dashboard
            </Link>
          )}
          <button onClick={handleLogout} style={styles.logout}>
            Logout
          </button>
        </div>
      </div>

      {/* Leaders grid */}
      <div style={styles.container}>
        {leaders.map((leader) => (
          <div key={leader.id} style={styles.card}>
            <img
              src={
              leader.photo_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(
                leader.name || "Leader"
              )}&background=random`
            }
              alt={leader.name}
              style={styles.avatar}
            />
            <h3 style={styles.name}>{leader.name}</h3>
            <p style={styles.position}>{leader.position}</p>
            {renderStars(ratings[leader.id])}

            <button
              style={styles.button}
              onClick={() => navigate(`/leader/${leader.id}`)}
            >
              View Public Page →
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "linear-gradient(120deg, #e3f0ff 0%, #f9f9f9 100%)",
    fontFamily: "'Inter', Arial, sans-serif",
    paddingTop: "100px", // so content isn't hidden by sticky header
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 1000,
    background: "#fff",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 24px",
    borderBottom: "1px solid #eee",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: "22px",
    color: "#1a237e",
    fontWeight: 800,
  },
  actions: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  adminLink: {
    background: "linear-gradient(90deg, #1877f2 0%, #42b72a 100%)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    textDecoration: "none",
    fontWeight: 600,
    fontSize: "14px",
  },
  logout: {
    backgroundColor: "#ef5350",
    color: "#fff",
    border: "none",
    padding: "10px 18px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
  },
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
    gap: "24px",
    padding: "20px",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: "16px",
    padding: "20px",
    boxShadow: "0 6px 20px rgba(0, 0, 0, 0.06)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    transition: "transform 0.2s",
  },
  avatar: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    objectFit: "cover",
    marginBottom: "14px",
    border: "3px solid #e3f0ff",
  },
  name: {
    textAlign: "center",
    fontSize: "18px",
    margin: "10px 0 4px",
    color: "#183153",
    fontWeight: 700,
  },
  position: {
    textAlign: "center",
    fontSize: "14px",
    color: "#4e5d78",
    marginBottom: "10px",
  },
  button: {
    marginTop: "10px",
    width: "100%",
    background: "linear-gradient(90deg, #1877f2 0%, #42b72a 100%)",
    color: "#fff",
    border: "none",
    padding: "10px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
  },
  stars: {
    textAlign: "center",
    marginBottom: "8px",
    fontSize: "18px",
  },
  loading: {
    textAlign: "center",
    fontSize: "18px",
    marginTop: "120px",
    color: "#555",
  },
};

export default Dashboard;
