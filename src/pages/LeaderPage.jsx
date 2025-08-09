import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const LeaderPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [leader, setLeader] = useState(null);
  const [comments, setComments] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [bio, setBio] = useState('');
  const [uploading, setUploading] = useState(false);
  const [views, setViews] = useState(0);
  const [ratings, setRatings] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: leaderData } = await supabase.from('leaders').select('*').eq('id', id).single();
      setLeader(leaderData);
      setBio(leaderData?.bio || '');

      const { data: ratingsData } = await supabase
        .from('ratings')
        .select('rating, comment, hidden, created_at')
        .eq('leader_id', id)
        .order('created_at', { ascending: false });

      const visible = (ratingsData || []).filter(r => !r.hidden);
      setComments(visible.map(r => r.comment));
      setRatings(visible.map(r => r.rating));

      // Increment views
      await supabase.from('leader_views').insert({ leader_id: id });
      const { count } = await supabase
        .from('leader_views')
        .select('*', { count: 'exact', head: true })
        .eq('leader_id', id);
      setViews(count);

      // Check if logged-in user owns this profile
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('leader_id')
          .eq('id', auth.user.id)
          .single();
        setIsOwnProfile(profile?.leader_id === id);
      }
    };

    fetchData();
  }, [id]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    const fileName = `${id}_${Date.now()}.${selectedFile.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, selectedFile, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      alert('Upload failed.');
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    await supabase.from('leaders').update({ profile_picture: publicUrl }).eq('id', id);
    setLeader((prev) => ({ ...prev, profile_picture: publicUrl }));
    setPreviewUrl(null);
    setSelectedFile(null);
    setUploading(false);
  };

  const handleSave = async () => {
    const { error } = await supabase.from('leaders').update({ bio }).eq('id', id);
    if (!error) alert('Profile updated!');
  };

  const handleNewComment = async () => {
    if (!newComment.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      alert('Please log in to comment.');
      return;
    }

    const { error } = await supabase.from('ratings').insert({
      leader_id: id,
      comment: newComment,
      rating: 0,
      hidden: false
    });

    if (!error) {
      setComments(prev => [newComment, ...prev]);
      setNewComment('');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  if (!leader) return <p>Loading...</p>;

  const averageRating =
    ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : 'No ratings';

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backBtn}>← Back</button>
      <h1>{leader.name} ({leader.position})</h1>

      <div style={styles.tabs}>
        <button onClick={() => setActiveTab('profile')}>Profile</button>
        <button onClick={() => setActiveTab('comments')}>Public Comments</button>
        <button onClick={() => setActiveTab('analytics')}>Analytics</button>
        {isOwnProfile && <button onClick={() => setActiveTab('edit')}>Edit My Profile</button>}
      </div>

      {activeTab === 'profile' && (
        <div style={styles.profileSection}>
          {leader.profile_picture && (
            <img
              src={leader.profile_picture}
              alt="Profile"
              style={styles.profileImage}
            />
          )}
          <div dangerouslySetInnerHTML={{ __html: leader.bio || '<i>No bio/manifesto yet.</i>' }} />
        </div>
      )}

      {activeTab === 'comments' && (
        <div style={styles.commentsSection}>
          <h3>Public Comments</h3>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
            style={{ width: '100%', marginBottom: '10px' }}
          />
          <button onClick={handleNewComment} style={styles.saveBtn}>Post Comment</button>
          {comments.length === 0 ? (
            <p>No comments yet.</p>
          ) : (
            comments.map((c, i) => <p key={i} style={styles.comment}>• {c}</p>)
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={styles.analytics}>
          <h3>Analytics</h3>
          <p><strong>Views:</strong> {views}</p>
          <p><strong>Average Rating:</strong> {averageRating}</p>
          <p><strong>Total Ratings:</strong> {ratings.length}</p>
        </div>
      )}

      {activeTab === 'edit' && isOwnProfile && (
        <div style={styles.editSection}>
          <h3>Edit Profile Picture</h3>
          {previewUrl && <img src={previewUrl} alt="Preview" style={styles.previewImg} />}
          <input type="file" accept="image/*" onChange={handleFileSelect} disabled={uploading} />
          {selectedFile && (
            <button onClick={handleUpload} style={styles.saveBtn}>Upload</button>
          )}
          {uploading && <p>Uploading...</p>}

          <h3>Bio / Manifesto</h3>
          <ReactQuill value={bio} onChange={setBio} style={styles.editor} />
          <button onClick={handleSave} style={styles.saveBtn}>Save</button>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '20px', maxWidth: '900px', margin: 'auto' },
  backBtn: { marginBottom: '10px', cursor: 'pointer' },
  tabs: { display: 'flex', gap: '10px', marginBottom: '20px' },
  profileImage: { width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', marginBottom: '15px' },
  previewImg: { width: '150px', height: '150px', borderRadius: '50%', objectFit: 'cover', margin: '10px 0' },
  profileSection: { marginTop: '20px' },
  commentsSection: { marginTop: '20px' },
  analytics: { marginTop: '20px' },
  editSection: { marginTop: '20px' },
  editor: { height: '200px', marginBottom: '20px' },
  saveBtn: { padding: '10px 20px', cursor: 'pointer' },
  comment: { padding: '5px 0', borderBottom: '1px solid #ddd' }
};

export default LeaderPage;
