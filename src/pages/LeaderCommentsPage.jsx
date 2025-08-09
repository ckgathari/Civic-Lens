import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';

const LeaderCommentsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leader, setLeader] = useState(null);
  const [comments, setComments] = useState([]);
  const [averageRating, setAverageRating] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: leaderData } = await supabase
        .from('leaders')
        .select('*')
        .eq('id', id)
        .single();

      if (leaderData) {
        setLeader(leaderData);
      }

      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating, comment, hidden')
        .eq('leader_id', id);

      const visibleComments = ratingsData?.filter(r => !r.hidden) || [];
      setComments(visibleComments.map(r => r.comment));
      
      if (ratingsData?.length > 0) {
        const validRatings = ratingsData.filter(r => !isNaN(r.rating));
        const avg = validRatings.reduce((sum, r) => sum + r.rating, 0) / validRatings.length;
        setAverageRating(avg.toFixed(1));
      }
    };

    fetchData();
  }, [id]);

  if (!leader) return <p>Loading...</p>;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/dashboard')} style={styles.backBtn}>← Back to Dashboard</button>
      <h2 style={styles.header}>{leader.name} ({leader.position})</h2>
      {leader.profile_picture && (
        <img src={leader.profile_picture} alt="Leader" style={styles.profileImage} />
      )}
      <p><strong>Location:</strong> {leader.county_name}, {leader.constituency_name}, {leader.ward_name}</p>
      {averageRating && <p><strong>Average Rating:</strong> ⭐ {averageRating}</p>}

      <div style={styles.commentsSection}>
        <h3 style={styles.subHeader}>Public Comments</h3>
        {comments.length === 0 ? (
          <p>No comments yet.</p>
        ) : (
          comments.map((c, i) => (
            <div key={i} style={styles.commentBox}>
              {c}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '800px', margin: 'auto', fontFamily: 'Arial, sans-serif' },
  backBtn: { marginBottom: '20px', cursor: 'pointer', backgroundColor: '#f0f0f0', padding: '10px', borderRadius: '5px', border: 'none' },
  header: { fontSize: '24px', marginBottom: '10px' },
  subHeader: { fontSize: '20px', marginTop: '30px' },
  profileImage: { width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px' },
  commentsSection: { marginTop: '20px' },
  commentBox: {
    backgroundColor: '#f9f9f9',
    padding: '10px 15px',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid #e0e0e0'
  }
};

export default LeaderCommentsPage;
