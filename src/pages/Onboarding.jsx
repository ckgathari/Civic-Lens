import React from 'react';
import LocationSelector from '../components/LocationSelector.jsx';

const Onboarding = () => {
  const handleLocationSelect = (locationData) => {
    console.log('Selected location:', locationData);
    // TODO: Save to user profile or state
  };
  return (
    <div>
      <h2>Welcome to CivicLens Onboarding</h2>
      <LocationSelector onLocationSelect={handleLocationSelect} />
      {/* More onboarding steps here */}
    </div>
  );
};

export default Onboarding;
