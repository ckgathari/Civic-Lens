// src/pages/SignUp.jsx
import React, { useState } from "react";
import supabase from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLeader, setIsLeader] = useState(false);
  const [isAspirant, setIsAspirant] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      // Step 1: Create user in Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) throw signUpError;

      const user = signUpData?.user;
      if (!user) {
        setError("Sign-up failed. Please try again.");
        return;
      }

      // Step 2: Insert placeholder profile row
      const { error: profileError } = await supabase
        .from("profiles")
        .insert([
          {
            id: user.id,
            full_name: fullName,
            is_leader: isLeader,
            is_aspirant: isAspirant,
          },
        ]);

      if (profileError) {
        console.error("Error inserting placeholder profile:", profileError.message);
      }

      // Step 3: Always redirect to login after signup
      alert("Sign-up successful! Please check your email to confirm your account.");
      navigate("/login");

    } catch (err) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <div
      style={{
        maxWidth: "400px",
        margin: "40px auto",
        padding: "20px",
        background: "#fff",
        borderRadius: "10px",
        boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Sign Up</h2>
      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}
      <form onSubmit={handleSignUp}>
        <div style={{ marginBottom: "15px" }}>
          <label>Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            style={{ width: "100%", padding: "10px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "100%", padding: "10px" }}
          />
        </div>
        <div style={{ marginBottom: "15px" }}>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: "100%", padding: "10px" }}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <input
            type="checkbox"
            checked={isLeader}
            onChange={(e) => {
              setIsLeader(e.target.checked);
              if (e.target.checked) setIsAspirant(false);
            }}
          />{" "}
          Leader
        </div>
        <div style={{ marginBottom: "20px" }}>
          <input
            type="checkbox"
            checked={isAspirant}
            onChange={(e) => {
              setIsAspirant(e.target.checked);
              if (e.target.checked) setIsLeader(false);
            }}
          />{" "}
          Aspirant
        </div>
        <button
          type="submit"
          style={{
            width: "100%",
            padding: "10px",
            background: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "5px",
          }}
        >
          Sign Up
        </button>
      </form>
    </div>
  );
}
