import React from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import LocationSelector from '../components/LocationSelector';

const LocationSelectorPage = () => {
  const navigate = useNavigate();

  // Handle the location submission
  const handleLocationSubmit = async (countyId, constituencyId, wardId) => {
    try {
      // Fetch the authenticated user
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error('Error fetching user:', userError?.message);
        alert('No authenticated user found. Please log in.');
        navigate('/login');
        return;
      }

      // Update the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          county_id: countyId,
          constituency_id: constituencyId,
          ward_id: wardId
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError.message);
        alert('Failed to save location');
      } else {
        console.log('Profile updated successfully');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Unexpected error:', error.message);
      alert('An unexpected error occurred');
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Select Your Location</h2>
      <LocationSelector onSubmit={handleLocationSubmit} />
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  heading: {
    textAlign: 'center',
    marginBottom: '20px'
  }
};

export default LocationSelectorPage;
