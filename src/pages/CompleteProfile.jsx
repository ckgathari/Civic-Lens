import React, { useState, useEffect } from "react";
import  supabase  from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function CompleteProfile() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [position, setPosition] = useState("");
  const [countyId, setCountyId] = useState("");
  const [constituencyId, setConstituencyId] = useState("");
  const [wardId, setWardId] = useState("");
  const [photoFile, setPhotoFile] = useState(null);

  const [counties, setCounties] = useState([]);
  const [constituencies, setConstituencies] = useState([]);
  const [wards, setWards] = useState([]);

  const [loading, setLoading] = useState(false);

  // Fetch counties on load
  useEffect(() => {
    fetchCounties();
  }, []);

  async function fetchCounties() {
    const { data, error } = await supabase.from("counties").select("id, name");
    if (!error) setCounties(data);
  }

  // Fetch constituencies when county changes
  useEffect(() => {
    if (countyId) fetchConstituencies(countyId);
  }, [countyId]);

  async function fetchConstituencies(countyId) {
    const { data, error } = await supabase
      .from("constituencies")
      .select("id, name")
      .eq("county_id", countyId);
    if (!error) setConstituencies(data);
  }

  // Fetch wards when constituency changes
  useEffect(() => {
    if (constituencyId) fetchWards(constituencyId);
  }, [constituencyId]);

  async function fetchWards(constituencyId) {
    const { data, error } = await supabase
      .from("wards")
      .select("id, name")
      .eq("constituency_id", constituencyId);
    if (!error) setWards(data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    // Basic validations
    if (!fullName || !phone || !nationalId || !position || !countyId || !photoFile) {
      alert("Please fill in all required fields and upload a photo.");
      setLoading(false);
      return;
    }

    const phoneRegex = /^(07|01)\d{8}$/;
    if (!phoneRegex.test(phone)) {
      alert("Phone must start with 07 or 01 and be exactly 10 digits.");
      setLoading(false);
      return;
    }

    if (!/^\d{7,8}$/.test(nationalId) || /^(12345678|0000000)$/.test(nationalId)) {
      alert("National ID must be 7 or 8 digits and not a simple pattern.");
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("User not logged in");
        setLoading(false);
        return;
      }

      // Upload photo
      const fileExt = photoFile.name.split(".").pop();
      const filePath = `profile-photos/${user.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(filePath, photoFile, { upsert: true });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase
        .storage
        .from("photos")
        .getPublicUrl(filePath);

      // Insert or update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          full_name: fullName,
          phone: phone,
          national_id: nationalId,
          position: position,
          county_id: countyId,
          constituency_id: constituencyId || null,
          ward_id: wardId || null,
          photo_url: publicUrlData.publicUrl,
          is_leader: position ? position.toLowerCase() !== "aspirant" : false,
          is_aspirant: position ? position.toLowerCase() === "aspirant" : false
        });

      if (profileError) {
        throw profileError;
      }

      alert("Profile completed successfully!");
      navigate("/dashboard");

    } catch (err) {
      console.error("Error completing profile:", err.message);
      alert("Error completing profile: " + err.message);
    }

    setLoading(false);
  }

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "20px", fontFamily: "Arial" }}>
      <h2 style={{ textAlign: "center", color: "#333" }}>Complete Your Profile</h2>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        
        <input type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />

        <input type="text" placeholder="Phone (07xxxxxxxx)" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} />

        <input type="text" placeholder="National ID" value={nationalId} onChange={e => setNationalId(e.target.value)} style={inputStyle} />

        <select value={position} onChange={e => setPosition(e.target.value)} style={inputStyle}>
          <option value="">Select Position</option>
          <option value="President">President</option>
          <option value="Governor">Governor</option>
          <option value="Senator">Senator</option>
          <option value="Woman Rep">Woman Rep</option>
          <option value="MP">MP</option>
          <option value="MCA">MCA</option>
          <option value="Aspirant">Aspirant</option>
        </select>

        <select value={countyId} onChange={e => setCountyId(e.target.value)} style={inputStyle}>
          <option value="">Select County</option>
          {counties.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {constituencies.length > 0 && (
          <select value={constituencyId} onChange={e => setConstituencyId(e.target.value)} style={inputStyle}>
            <option value="">Select Constituency</option>
            {constituencies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        {wards.length > 0 && (
          <select value={wardId} onChange={e => setWardId(e.target.value)} style={inputStyle}>
            <option value="">Select Ward</option>
            {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        )}

        <input type="file" accept="image/*" onChange={e => setPhotoFile(e.target.files[0])} style={inputStyle} />

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? "Saving..." : "Complete Profile"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  padding: "10px",
  borderRadius: "5px",
  border: "1px solid #ccc",
  fontSize: "14px"
};

const buttonStyle = {
  padding: "12px",
  borderRadius: "5px",
  border: "none",
  backgroundColor: "#4CAF50",
  color: "white",
  fontSize: "16px",
  cursor: "pointer"
};
