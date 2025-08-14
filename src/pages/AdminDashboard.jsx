import React, { useEffect, useState } from 'react';
import supabase from '../supabaseClient';
import Papa from 'papaparse';

const AdminDashboard = () => {
  const [filterCounty, setFilterCounty] = useState('All');
  const [filterPosition, setFilterPosition] = useState('All');
  const [leaderStats, setLeaderStats] = useState([]);
  const [counties, setCounties] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    national_id: '',
    phone_number: '',
    position: '',
    county_id: '',
    constituency_id: '',
    ward_id: '',
    photo: null
  });

  useEffect(() => {
    const loadCounties = async () => {
      const { data } = await supabase.from('counties').select('id, name');
      setCounties(data || []);
    };
    loadCounties();
  }, []);

  useEffect(() => {
    if (formData.county_id) {
      const loadConstituencies = async () => {
        const { data } = await supabase
          .from('constituencies')
          .select('id, name')
          .eq('county_id', formData.county_id);
        setConstituencies(data || []);
        setFormData(prev => ({ ...prev, constituency_id: '', ward_id: '' }));
        setWards([]);
      };
      loadConstituencies();
    }
  }, [formData.county_id]);

  useEffect(() => {
    if (formData.constituency_id) {
      const loadWards = async () => {
        const { data } = await supabase
          .from('wards')
          .select('id, name')
          .eq('constituency_id', formData.constituency_id);
        setWards(data || []);
        setFormData(prev => ({ ...prev, ward_id: '' }));
      };
      loadWards();
    }
  }, [formData.constituency_id]);

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

  const generatePassword = () => {
    const pwd = Math.random().toString(36).slice(-10);
    navigator.clipboard.writeText(pwd);
    return pwd;
  };

  const handleAddLeader = async () => {
    const password = generatePassword();
    alert(`Password generated and copied: ${password}`);

    // Sign up user (no email confirmation to allow immediate login)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: formData.email,
      password
    });

    if (signUpError) {
      alert('Error creating user');
      console.error(signUpError);
      return;
    }

    const newUserId = signUpData.user?.id;
    if (!newUserId) {
      alert('User ID missing after sign-up.');
      return;
    }

    // Upload photo if exists
    let photo_url = null;
    if (formData.photo) {
      const fileExt = formData.photo.name.split('.').pop();
      const filePath = `leaders/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('profile_photos')
        .upload(filePath, formData.photo);
      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('profile_photos')
          .getPublicUrl(filePath);
        photo_url = publicUrlData.publicUrl;
      }
    }

    // Determine leader/aspirant status
    const leaderPositions = ['President', 'Governor', 'Senator', 'Women Rep', 'MP', 'MCA'];
    const isLeader = leaderPositions.includes(formData.position);
    const isAspirant = !isLeader;

    // Insert into profiles
    const { error: insertError } = await supabase.from('profiles').insert([{
      id: newUserId,
      first_name: formData.first_name,
      last_name: formData.last_name,
      national_id: formData.national_id,
      phone_number: formData.phone_number,
      position: formData.position,
      county_id: formData.county_id || null,
      constituency_id: formData.constituency_id || null,
      ward_id: formData.ward_id || null,
      photo_url,
      is_leader: isLeader,
      is_aspirant: isAspirant
    }]);

    if (insertError) {
      alert('Error saving profile');
      console.error(insertError);
    } else {
      alert('Leader/Aspirant added successfully!');
      setShowModal(false);
      fetchStats();
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.heading}>Admin Dashboard</h1>

      <div style={styles.topBar}>
        <div style={styles.filters}>
          <select value={filterCounty} onChange={e => setFilterCounty(e.target.value)} style={styles.select}>
            <option value="All">All Counties</option>
            {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterPosition} onChange={e => setFilterPosition(e.target.value)} style={styles.select}>
            <option value="All">All Positions</option>
            {['President', 'Governor', 'Senator', 'Women Rep', 'MP', 'MCA'].map(pos => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
          <button onClick={exportCSV} style={styles.button}>Export CSV</button>
        </div>
        <div>
          <button onClick={() => setShowModal(true)} style={styles.addBtn}>Add Leader/Aspirant</button>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/login'; }} style={styles.logoutBtn}>Logout</button>
        </div>
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
        ))
      )}

      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h2>Add Leader / Aspirant</h2>
            <input style={styles.input} placeholder="First Name" onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
            <input style={styles.input} placeholder="Last Name" onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
            <input style={styles.input} type="email" placeholder="Email" onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <input style={styles.input} placeholder="National ID" onChange={e => setFormData({ ...formData, national_id: e.target.value })} />
            <input style={styles.input} placeholder="Phone Number" onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
            <select style={styles.input} onChange={e => setFormData({ ...formData, position: e.target.value })}>
              <option value="">Select Position</option>
              {['President', 'Governor', 'Senator', 'Women Rep', 'MP', 'MCA'].map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>

            {['Governor', 'Senator', 'Women Rep', 'MP', 'MCA'].includes(formData.position) && (
              <select style={styles.input} value={formData.county_id} onChange={e => setFormData({ ...formData, county_id: e.target.value })}>
                <option value="">Select County</option>
                {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {['MP', 'MCA'].includes(formData.position) && (
              <select style={styles.input} value={formData.constituency_id} onChange={e => setFormData({ ...formData, constituency_id: e.target.value })}>
                <option value="">Select Constituency</option>
                {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}

            {['MCA'].includes(formData.position) && (
              <select style={styles.input} value={formData.ward_id} onChange={e => setFormData({ ...formData, ward_id: e.target.value })}>
                <option value="">Select Ward</option>
                {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            )}

            <input style={styles.input} type="file" onChange={e => setFormData({ ...formData, photo: e.target.files[0] })} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={handleAddLeader} style={styles.saveBtn}>Save</button>
              <button onClick={() => setShowModal(false)} style={styles.cancelBtn}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '1000px', margin: 'auto', fontFamily: 'Arial' },
  heading: { textAlign: 'center', marginBottom: '20px' },
  topBar: { display: 'flex', justifyContent: 'space-between', marginBottom: '20px' },
  filters: { display: 'flex', gap: '10px' },
  select: { padding: '8px', borderRadius: '4px', border: '1px solid #ccc' },
  button: { padding: '8px 12px', backgroundColor: '#4CAF50', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  addBtn: { padding: '8px 12px', backgroundColor: '#2196F3', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '10px' },
  logoutBtn: { padding: '8px 12px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' },
  card: { background: '#f7f7f7', padding: '15px', borderRadius: '8px', marginBottom: '15px' },
  hideBtn: { marginLeft: '10px', cursor: 'pointer', background: 'none', border: 'none', color: '#2196F3' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modal: { background: '#fff', padding: '20px', borderRadius: '8px', width: '400px' },
  input: { width: '100%', padding: '8px', marginBottom: '10px', borderRadius: '4px', border: '1px solid #ccc' },
  saveBtn: { background: '#4CAF50', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' },
  cancelBtn: { background: '#999', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }
};

export default AdminDashboard;
