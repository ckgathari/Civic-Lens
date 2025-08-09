import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';

function LocationSelector({ onSubmit }) {
  const [counties, setCounties] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [wards, setWards] = useState([]);

  const [selectedCounty, setSelectedCounty] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  useEffect(() => {
    const fetchCounties = async () => {
      const { data, error } = await supabase.from('counties').select('*');
      if (error) {
        console.error('Error fetching counties:', error.message);
      } else {
        setCounties(data || []);
      }
    };
    fetchCounties();
  }, []);

  useEffect(() => {
    const fetchConstituencies = async () => {
      if (selectedCounty) {
        const { data, error } = await supabase
          .from('constituencies')
          .select('*')
          .eq('county_id', selectedCounty);
        if (error) {
          console.error('Error fetching constituencies:', error.message);
        } else {
          setConstituencies(data || []);
        }
      } else {
        setConstituencies([]);
        setWards([]);
      }
    };
    fetchConstituencies();
  }, [selectedCounty]);

  useEffect(() => {
    const fetchWards = async () => {
      if (selectedConstituency) {
        const { data, error } = await supabase
          .from('wards')
          .select('*')
          .eq('constituency_id', selectedConstituency);
        if (error) {
          console.error('Error fetching wards:', error.message);
        } else {
          setWards(data || []);
        }
      } else {
        setWards([]);
      }
    };
    fetchWards();
  }, [selectedConstituency]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!onSubmit) {
      console.error('No onSubmit function provided to LocationSelector.');
      alert('Something went wrong. Please contact support.');
      return;
    }
    onSubmit(selectedCounty, selectedConstituency, selectedWard);
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>County:</label>
        <select
          value={selectedCounty}
          onChange={(e) => setSelectedCounty(e.target.value)}
          required
          style={styles.select}
        >
          <option value="">Select County</option>
          {counties.map((county) => (
            <option key={county.id} value={county.id}>
              {county.name}
            </option>
          ))}
        </select>

        <label style={styles.label}>Constituency:</label>
        <select
          value={selectedConstituency}
          onChange={(e) => setSelectedConstituency(e.target.value)}
          required
          style={styles.select}
          disabled={!selectedCounty}
        >
          <option value="">Select Constituency</option>
          {constituencies.map((constituency) => (
            <option key={constituency.id} value={constituency.id}>
              {constituency.name}
            </option>
          ))}
        </select>

        <label style={styles.label}>Ward:</label>
        <select
          value={selectedWard}
          onChange={(e) => setSelectedWard(e.target.value)}
          required
          style={styles.select}
          disabled={!selectedConstituency}
        >
          <option value="">Select Ward</option>
          {wards.map((ward) => (
            <option key={ward.id} value={ward.id}>
              {ward.name}
            </option>
          ))}
        </select>

        <button type="submit" style={styles.button}>Save Location</button>
      </form>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    maxWidth: '400px',
    margin: '0 auto'
  },
  form: {
    display: 'flex',
    flexDirection: 'column'
  },
  label: {
    marginTop: '10px',
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  select: {
    padding: '8px',
    borderRadius: '4px',
    border: '1px solid #ccc'
  },
  button: {
    marginTop: '20px',
    padding: '10px',
    borderRadius: '4px',
    backgroundColor: '#007bff',
    color: '#fff',
    border: 'none',
    cursor: 'pointer'
  }
};

export default LocationSelector;
