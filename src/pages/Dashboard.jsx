import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const Dashboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get current user
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const user = userData?.user;
        if (!user) {
          navigate('/login');
          return;
        }

        // Get profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;
        if (!profile) {
          console.warn('No profile found for user:', user.id);
          navigate('/complete-profile');
          return;
        }

        // Get leaders
        const { data: president, error: presidentError } = await supabase
          .from('leaders')
          .select('*')
          .eq('position', 'President');
        if (presidentError) throw presidentError;

        const { data: countyLeaders, error: countyError } = await supabase
          .from('leaders')
          .select('*')
          .in('position', ['Governor', 'Senator', 'Women Rep'])
          .eq('county_id', profile.county_id);
        if (countyError) throw countyError;

        const { data: mp, error: mpError } = await supabase
          .from('leaders')
          .select('*')
          .eq('position', 'MP')
          .eq('constituency_id', profile.constituency_id)
          .maybeSingle();
        if (mpError) throw mpError;

        const { data: mca, error: mcaError } = await supabase
          .from('leaders')
          .select('*')
          .eq('position', 'MCA')
          .eq('ward_id', profile.ward_id)
          .maybeSingle();
        if (mcaError) throw mcaError;

        // Merge leaders
        const allLeaders = [
          ...(president || []),
          ...(countyLeaders || []),
          ...(mp ? [mp] : []),
          ...(mca ? [mca] : [])
        ];

        setLeaders(allLeaders);
      } catch (err) {
        console.error('Error loading dashboard data:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleRatingSubmit = async (leaderId) => {
    const ratingValue = ratings[leaderId] || 0;
    const comment = comments[leaderId] || '';

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      alert('You must be logged in to rate.');
      return;
    }

    const { error } = await supabase.from('ratings').upsert(
      {
        user_id: user.id,
        leader_id: leaderId,
        rating: ratingValue,
        comment
      },
      { onConflict: ['user_id', 'leader_id'] }
    );

    if (error) {
      alert('Error submitting rating');
    } else {
      alert('Rating submitted!');
    }
  };

  const renderStars = (leaderId) => {
    const currentRating = ratings[leaderId] || 0;
    return (
      <div style={styles.stars}>
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            onClick={() =>
              setRatings((prev) => ({ ...prev, [leaderId]: star }))
            }
            style={{
              fontSize: '20px',
              color: star <= currentRating ? '#fbbf24' : '#ccc',
              cursor: 'pointer'
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
      <div style={styles.header}>
        <h1 style={styles.title}>🌍 CivicLens Dashboard</h1>
        <button onClick={handleLogout} style={styles.logout}>Logout</button>
      </div>

      <div style={styles.container}>
        {leaders.map((leader) => (
          <div key={leader.id} style={styles.card}>
            <img
              src={leader.photo_url || 'https://via.placeholder.com/100?text=👤'}
              alt={leader.name}
              style={styles.avatar}
            />
            <h3 style={styles.name}>{leader.name}</h3>
            <p style={styles.position}>{leader.position}</p>

            <Link to={`/leader-comments/${leader.id}`} style={styles.link}>
              View Public Comments →
            </Link>

            {renderStars(leader.id)}
            <textarea
              placeholder="Leave a comment..."
              value={comments[leader.id] || ''}
              onChange={(e) =>
                setComments((prev) => ({ ...prev, [leader.id]: e.target.value }))
              }
              style={styles.textarea}
            />
            <button
              onClick={() => handleRatingSubmit(leader.id)}
              style={styles.submit}
            >
              Submit Rating
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    minHeight: '100vh',
    background: 'linear-gradient(to right, #f0f4ff, #eaf7ff)',
    fontFamily: 'Segoe UI, sans-serif',
    padding: '30px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '40px'
  },
  title: {
    fontSize: '28px',
    color: '#1a237e'
  },
  logout: {
    backgroundColor: '#ef5350',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  container: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '30px',
    justifyContent: 'center'
  },
  card: {
    width: '300px',
    backgroundColor: '#ffffff',
    borderRadius: '15px',
    padding: '20px',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
    transition: 'transform 0.3s ease'
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    objectFit: 'cover',
    margin: '0 auto 10px',
    display: 'block'
  },
  name: {
    textAlign: 'center',
    fontSize: '18px',
    margin: '10px 0 4px',
    color: '#333'
  },
  position: {
    textAlign: 'center',
    fontSize: '14px',
    color: '#666',
    marginBottom: '10px'
  },
  link: {
    display: 'block',
    textAlign: 'center',
    fontSize: '13px',
    color: '#1976d2',
    textDecoration: 'none',
    marginBottom: '10px'
  },
  stars: {
    textAlign: 'center',
    marginBottom: '10px'
  },
  textarea: {
    width: '100%',
    minHeight: '60px',
    borderRadius: '8px',
    border: '1px solid #ddd',
    padding: '8px',
    marginBottom: '10px',
    fontSize: '14px'
  },
  submit: {
    width: '100%',
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    padding: '10px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease'
  },
  loading: {
    textAlign: 'center',
    fontSize: '18px',
    marginTop: '100px',
    color: '#555'
  }
};

export default Dashboard;
