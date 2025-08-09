import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import  supabase  from './supabaseClient';
import SignupPage from './pages/SignupPage';
import LoginPage from './pages/LoginPage';
import Onboarding from './pages/Onboarding';
import LeaderPage from './pages/LeaderPage';
import AdminDashboard from './pages/AdminDashboard';
import LocationSelectorPage from './pages/LocationSelectorPage';
import Dashboard from './pages/Dashboard';
import LeaderCommentsPage from './pages/LeaderCommentsPage';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import CompleteProfile from './pages/CompleteProfile';
import 'react-quill/dist/quill.snow.css';

// Route wrapper to handle post-login redirection logic
function AuthRedirect() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      // Fetch profile data
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error || !profile) {
        console.error('Profile not found or error fetching:', error);
        navigate('/complete-profile');
        return;
      }

      // Redirect flow logic
      if ((profile.is_leader || profile.is_aspirant) && (!profile.phone || !profile.national_id || !profile.position)) {
        navigate('/complete-profile');
      } else if (!profile.county_id || (!profile.is_leader && !profile.is_aspirant && !profile.constituency_id && !profile.ward_id)) {
        navigate('/location-selector');
      } else {
        navigate('/dashboard');
      }
    }

    checkUser().finally(() => setLoading(false));
  }, [navigate]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return null;
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Default route */}
        <Route path="/" element={<Navigate to="/auth-redirect" />} />

        {/* Special redirect handler */}
        <Route path="/auth-redirect" element={<AuthRedirect />} />

        {/* Auth & profile setup */}
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/complete-profile" element={<CompleteProfile />} />
        <Route path="/location-selector" element={<LocationSelectorPage />} />

        {/* App routes */}
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/leader/:id" element={<LeaderPage />} />
        <Route path="/leader-comments/:id" element={<LeaderCommentsPage />} />

        {/* Password reset */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
      </Routes>
    </Router>
  );
}

export default App;
