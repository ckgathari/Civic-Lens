import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import supabase from '../supabaseClient';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (authError) throw authError;

      // Get user ID
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData?.user?.id;
      if (!userId) throw new Error('User ID not found.');

      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (profileError) throw profileError;

      // Check completeness 

      if (!profile) {
        navigate('/complete-profile');
      } else {
        navigate('/dashboard');
      }

    } catch (err) {
      console.error('Login error:', err.message);
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
    } catch {
      setErrorMsg('Google login failed. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoContainer}>
          <img
            src="/logo.png"
            alt="CivicLens Logo"
            style={styles.logo}
          />
        </div>

        {/* Headings */}
        <h2 style={styles.heading}>Welcome Back</h2>
        <p style={styles.subheading}>Login to your CivicLens account</p>

        {/* Error message */}
        {errorMsg && <p style={styles.error}>{errorMsg}</p>}

        {/* Form */}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div style={styles.forgotPasswordContainer}>
            <Link to="/forgot-password" style={styles.forgotPasswordLink}>
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            style={styles.button}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {/* Social login */}
        <div style={styles.orDivider}>OR</div>
        <button onClick={handleGoogleLogin} style={styles.googleButton}>
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg"
            alt="Google icon"
            style={styles.googleIcon}
          />
          Continue with Google
        </button>

        {/* Sign up prompt */}
        <p style={styles.linkText}>
          Don't have an account?{' '}
          <Link to="/signup" style={styles.link}>Sign up</Link>
        </p>
      </div>
    </div>
  );
};

// Inline styles stay exactly as before
const styles = {
  container: {
    minHeight: '100vh',
    background: '#f0f4f8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px'
  },
  card: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    width: '100%',
    textAlign: 'center'
  },
  logoContainer: {
    marginBottom: '20px'
  },
  logo: {
    width: '80px',
    height: 'auto'
  },
  heading: {
    marginBottom: '10px',
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#1a1a1a'
  },
  subheading: {
    marginBottom: '20px',
    color: '#6c757d',
    fontSize: '14px'
  },
  input: {
    width: '100%',
    padding: '12px',
    margin: '10px 0',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '14px'
  },
  forgotPasswordContainer: {
    textAlign: 'right',
    marginTop: '-5px',
    marginBottom: '10px'
  },
  forgotPasswordLink: {
    fontSize: '13px',
    color: '#007bff',
    textDecoration: 'none'
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  orDivider: {
    margin: '20px 0 10px',
    fontSize: '14px',
    color: '#999'
  },
  googleButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#fff',
    border: '1px solid #ccc',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px'
  },
  googleIcon: {
    width: '18px',
    height: '18px'
  },
  linkText: {
    marginTop: '20px',
    fontSize: '14px',
    color: '#555'
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
    fontWeight: '500'
  },
  error: {
    color: '#dc3545',
    fontSize: '14px',
    marginBottom: '10px'
  }
};

export default Login;
