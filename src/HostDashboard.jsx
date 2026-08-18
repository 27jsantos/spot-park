import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function HostDashboard({ onBack }) {
  const [mySpaces, setMySpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("spaces").select("*").eq("owner_id", user.id);
    if (error) console.error(error);
    else setMySpaces(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    const confirmed = window.confirm("Remove this space from Spot Park?");
    if (!confirmed) return;
    const { error } = await supabase.from("spaces").delete().eq("id", id);
    if (error) {
      alert("Something went wrong deleting this space.");
      console.error(error);
    } else {
      load();
    }
  }

  const totalPossibleEarnings = mySpaces.reduce((sum, s) => sum + s.price, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#C7CDD6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 24, color: "#1E2233" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#FFFFFF", border: "1px solid #B4BBC7", borderRadius: 6, padding: "5px 10px", color: "#1E2233", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>My Host Dashboard</h1>

        <div style={{ background: "#FFFFFF", border: "1px solid #B4BBC7", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#5A6178" }}>Your listed spaces</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{mySpaces.length}</div>
          <div style={{ fontSize: 13, color: "#5A6178", marginTop: 8 }}>Combined hourly rate</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>${totalPossibleEarnings}/hr</div>
        </div>

        {loading && <div style={{ color: "#5A6178" }}>Loading...</div>}

        {!loading && mySpaces.length === 0 && (
          <div style={{ color: "#5A6178", fontSize: 14 }}>
            You haven't listed any spaces yet. Go back and tap "+ List a Space" to add one.
          </div>
        )}

        {!loading && mySpaces.map((s) => (
          <div key={s.id} style={{ background: "#FFFFFF", border: "1px solid #B4BBC7", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong>{s.name}</strong>
                <div style={{ fontSize: 13, color: "#5A6178", marginTop: 4 }}>
                  ${s.price}/hr · {s.hours} · {s.width}' × {s.length}'
                </div>
              </div>
              <button
                onClick={() => handleDelete(s.id)}
                style={{ background: "#fbe6e6", color: "#a33030", border: "none", padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}