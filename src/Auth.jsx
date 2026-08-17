import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) setMessage(error.message);
      else if (data.session) onLoggedIn(data.session.user);
      else setMessage("Check your email to confirm your account, then log in.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else onLoggedIn(data.user);
    }
  }

  return (
    <div style={{ maxWidth: 360, margin: "80px auto", fontFamily: "sans-serif", padding: 16 }}>
      <h1 style={{ fontSize: 22, marginBottom: 16 }}>Spot Park</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          required
        />
        <button
          type="submit"
          style={{ background: "#2f7d3c", color: "white", border: "none", padding: 12, borderRadius: 6, fontWeight: "bold" }}
        >
          {mode === "signup" ? "Sign Up" : "Log In"}
        </button>
      </form>

      {message && <div style={{ marginTop: 12, fontSize: 13, color: "#a33030" }}>{message}</div>}

      <div style={{ marginTop: 16, fontSize: 13 }}>
        {mode === "login" ? (
          <>Don't have an account? <a href="#" onClick={() => setMode("signup")}>Sign up</a></>
        ) : (
          <>Already have an account? <a href="#" onClick={() => setMode("login")}>Log in</a></>
        )}
      </div>
    </div>
  );
}