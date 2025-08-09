import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import Papa from 'papaparse';

const ADMIN_ROLE = 'admin';

const AdminDashboard = () => {
  const [filterCounty, setFilterCounty] = useState('All');
  const [filterPosition, setFilterPosition] = useState('All');
  const [leaderStats, setLeaderStats] = useState([]);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load counties only once
  useEffect(() => {
    const loadCounties = async () => {
      const { data: countyData } = await supabase.from('counties').select('id, name');
      setCounties(countyData || []);
    };
    loadCounties();
  }, []);

  // Fetch stats when filters change
  useEffect(() => {
    fetchStats();
  }, [filterCounty, filterPosition]);

  const fetchStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();

    if (!profile?.is_admin) {
      alert('Unauthorized: Admin access only');
      window.location.href = '/';
      return;
    }

    let query = supabase.rpc('get_leader_stats').order('name');

    if (filterCounty !== 'All') query = query.eq('county_id', filterCounty);
    if (filterPosition !== 'All') query = query.eq('position', filterPosition);

    const { data, error } = await query;
    if (error) console.error(error);

    setLeaderStats(data || []);
    setLoading(false);
  };

  const exportCSV = () => {
    const flat = leaderStats.flatMap(l =>
      (l.comments || []).map(comment => ({
        id: l.id,
        name: l.name,
        position: l.position,
        avg_rating: l.avg_rating,
        total_ratings: l.total_ratings,
        comment
      }))
    );
    const csv = Papa.unparse(flat);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'leader_stats.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleHideComment = async (leaderId, commentText, currentHidden) => {
    const { error } = await supabase
      .from('ratings')
      .update({ hidden: !currentHidden })
      .eq('leader_id', leaderId)
      .eq('comment', commentText);

    if (!error) fetchStats();
  };

  return (
    <div style={styles.container}>
      <h1>Admin Dashboard</h1>

      <div style={styles.filters}>
        <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)}>
          <option value="All">All Counties</option>
          {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={filterPosition} onChange={e => setFilterPosition(e.target.value)}>
          <option value="All">All Positions</option>
          {['President', 'Governor', 'Senator', 'Women Rep', 'MP', 'MCA'].map(pos => (
            <option key={pos} value={pos}>{pos}</option>
          ))}
        </select>

        <button onClick={exportCSV} style={styles.exportBtn}>Export CSV</button>
      </div>

      {loading ? (
        <p>Loading data…</p>
      ) : leaderStats.length === 0 ? (
        <p>No leaders found.</p>
      ) : (
        leaderStats.map(l => (
          <div key={l.id} style={styles.card}>
            <h3>{l.name} ({l.position}) - Avg: {l.avg_rating?.toFixed(2) || 'N/A'}</h3>
            <p>Total ratings: {l.total_ratings}</p>
            <div>
              {l.comments?.map((c, i) => (
                <div key={i} style={{ marginBottom: '8px', opacity: c.hidden ? 0.4 : 1 }}>
                  "{c.text}"
                  <button
                    onClick={() => toggleHideComment(l.id, c.text, c.hidden)}
                    style={styles.hideBtn}
                  >
                    {c.hidden ? 'Unhide' : 'Hide'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: 'auto' },
  filters: { display: 'flex', gap: '10px', marginBottom: '20px' },
  exportBtn: { padding: '6px 12px', cursor: 'pointer' },
  card: { background: '#f7f7f7', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
  hideBtn: { marginLeft: '10px', cursor: 'pointer' }
};

export default AdminDashboard;
