import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const Dashboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [ratings, setRatings] = useState({});
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const user = userData?.user;
        if (!user) {
          navigate('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        if (!profile) {
          navigate('/complete-profile');
          return;
        }

        setIsAdmin(!!profile.is_admin);

        const { data: president } = await supabase
          .from('leaders')
          .select('*')
          .eq('position', 'President');

        const { data: countyLeaders } = await supabase
          .from('leaders')
          .select('*')
          .in('position', ['Governor', 'Senator', 'Women Rep'])
          .eq('county_id', profile.county_id);

        const { data: mp } = await supabase
          .from('leaders')
          .select('*')
          .eq('position', 'MP')
          .eq('constituency_id', profile.constituency_id)
          .maybeSingle();

        const { data: mca } = await supabase
          .from('leaders')
          .select('*')
          .eq('position', 'MCA')
          .eq('ward_id', profile.ward_id)
          .maybeSingle();

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
        <div>
          {isAdmin && (
            <Link to="/admin" style={styles.adminLink}>
              Admin Dashboard
            </Link>
          )}
          <button onClick={handleLogout} style={styles.logout}>Logout</button>
        </div>
      </div>

      <div style={styles.container}>
        {leaders.map((leader) => (
          <div key={leader.id} style={styles.card}>
            <img
              src={leader.photo_url || 'https://placehold.co/600x400@2x.png'}
              alt={leader.name}
              style={styles.avatar}
            />
            <h3 style={styles.name}>{leader.name}</h3>
            <p style={styles.position}>{leader.position}</p>

            <button
              style={styles.button}
              onClick={() => window.location.href = `/leader/${leader.id}`}
            >
              View Public Comments →
            </button>


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
    background: 'linear-gradient(120deg, #e3f0ff 0%, #f9f9f9 100%)',
    fontFamily: "'Inter', Arial, sans-serif",
    padding: '40px 0'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '48px',
    padding: '0 40px'
  },
  title: {
    fontSize: '32px',
    color: '#1a237e',
    fontWeight: 800,
    letterSpacing: 1
  },
  adminLink: {
    background: 'linear-gradient(90deg, #1877f2 0%, #42b72a 100%)',
    color: '#fff',
    padding: '12px 20px',
    borderRadius: '8px',
    textDecoration: 'none',
    marginRight: '14px',
    fontWeight: 600,
    fontSize: '16px',
    boxShadow: '0 2px 8px rgba(24,119,242,0.08)',
    transition: 'background 0.2s'
  },
  logout: {
    backgroundColor: '#ef5350',
    color: '#fff',
    border: 'none',
    padding: '12px 22px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    boxShadow: '0 2px 8px rgba(239,83,80,0.08)',
    transition: 'background 0.2s'
  },
  container: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '36px',
    justifyContent: 'center',
    padding: '0 40px'
  },
  card: {
    width: '340px',
    backgroundColor: '#fff',
    borderRadius: '18px',
    padding: '28px 24px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.09)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative'
  },
  avatar: {
    width: '110px',
    height: '110px',
    borderRadius: '50%',
    objectFit: 'cover',
    marginBottom: '16px',
    border: '4px solid #e3f0ff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
  },
  name: {
    textAlign: 'center',
    fontSize: '22px',
    margin: '12px 0 6px',
    color: '#183153',
    fontWeight: 700
  },
  position: {
    textAlign: 'center',
    fontSize: '16px',
    color: '#4e5d78',
    marginBottom: '14px',
    fontWeight: 500
  },
  button: {
    width: '100%',
    background: 'linear-gradient(90deg, #1877f2 0%, #42b72a 100%)',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    marginBottom: '14px',
    boxShadow: '0 1px 6px rgba(24,119,242,0.10)',
    transition: 'background 0.2s'
  },
  stars: {
    textAlign: 'center',
    marginBottom: '12px',
    fontSize: '22px'
  },
  textarea: {
    width: '100%',
    minHeight: '64px',
    borderRadius: '8px',
    border: '1.5px solid #bcd0ee',
    padding: '12px',
    marginBottom: '12px',
    fontSize: '15px',
    background: '#f7fbff',
    lineHeight: 1.5,
    outline: 'none',
    transition: 'border 0.2s'
  },
  submit: {
    width: '100%',
    backgroundColor: '#42b72a',
    color: '#fff',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: '16px',
    boxShadow: '0 1px 6px rgba(66,183,42,0.10)',
    transition: 'background 0.2s'
  },
  loading: {
    textAlign: 'center',
    fontSize: '20px',
    marginTop: '120px',
    color: '#555'
  }
};

export default Dashboard;
