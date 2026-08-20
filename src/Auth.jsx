import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth({ onLoggedIn }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
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
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", alignItems: "center", padding: 20 }}>
      <div style={{ width: 360, background: "#0d2c64", borderRadius: 24, padding: 32, color: "#FFFFFF" }}>
        <h1 style={{ fontSize: 24, marginBottom: 20, fontWeight: 800 }}>Spot Park</h1>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: 12, border: "1px solid #3B4F73", borderRadius: 8, background: "#FFFFFF", color: "#1E2233" }}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: 12, border: "1px solid #3B4F73", borderRadius: 8, background: "#FFFFFF", color: "#1E2233" }}
            required
          />
          <button
            type="submit"
            style={{ background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, cursor: "pointer", marginTop: 4 }}
          >
            {mode === "signup" ? "Sign Up" : "Log In"}
          </button>
        </form>

        {message && <div style={{ marginTop: 12, fontSize: 13, color: "#FCA5A5" }}>{message}</div>}

        <div style={{ marginTop: 16, fontSize: 13, color: "#B7C4DC" }}>
          {mode === "login" ? (
            <>Don't have an account? <a href="#" onClick={() => setMode("signup")} style={{ color: "#8FB4FF", fontWeight: 700 }}>Sign up</a></>
          ) : (
            <>Already have an account? <a href="#" onClick={() => setMode("login")} style={{ color: "#8FB4FF", fontWeight: 700 }}>Log in</a></>
          )}
        </div>
      </div>
    </div>
  );
}