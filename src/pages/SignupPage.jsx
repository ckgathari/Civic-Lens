import React, { useState } from 'react';
import  supabase  from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

const SignUp = () => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Sign-up successful! Please check your email to confirm your account.');
      setTimeout(() => {
        navigate('/login');
      }, 3000); // Redirect after 3 seconds
    }
  };

  const styles = {
    container: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f4f4f4'
    },
    form: {
      background: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      width: '350px'
    },
    title: {
      textAlign: 'center',
      marginBottom: '20px',
      color: '#333'
    },
    input: {
      width: '100%',
      padding: '10px',
      marginBottom: '10px',
      borderRadius: '5px',
      border: '1px solid #ccc'
    },
    button: {
      width: '100%',
      padding: '10px',
      backgroundColor: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px'
    },
    message: {
      marginTop: '15px',
      textAlign: 'center'
    },
    link: {
      color: '#4CAF50',
      textDecoration: 'none',
      fontWeight: 'bold'
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSignUp} style={styles.form}>
        <h2 style={styles.title}>Sign Up</h2>

        <input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={formData.first_name}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={formData.last_name}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          required
          style={styles.input}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
          style={{ ...styles.input, marginBottom: '20px' }}
        />

        <button type="submit" disabled={loading} style={styles.button}>
          {loading ? 'Signing Up...' : 'Sign Up'}
        </button>

        {message && (
          <p
            style={{
              ...styles.message,
              color: message.includes('successful') ? 'green' : 'red'
            }}
          >
            {message}
          </p>
        )}

        <p style={{ textAlign: 'center', marginTop: '15px' }}>
          Already have an account?{' '}
          <a href="/login" style={styles.link}>
            Login here
          </a>
        </p>
      </form>
    </div>
  );
};

export default SignUp;
