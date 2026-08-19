import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function MyReservations({ onBack }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("reservations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setReservations(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(id) {
    const confirmed = window.confirm("Cancel this reservation?");
    if (!confirmed) return;
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) {
      alert("Something went wrong cancelling this reservation.");
      console.error(error);
    } else {
      load();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, padding: 20, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: "#FFFFFF" }}>My Reservations</h1>

        {loading && <div style={{ color: "#B7C4DC" }}>Loading...</div>}

        {!loading && reservations.length === 0 && (
          <div style={{ color: "#B7C4DC", fontSize: 14 }}>
            You haven't reserved a space yet.
          </div>
        )}

        {!loading && reservations.map((r) => (
          <div key={r.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong style={{ color: "#1E2233" }}>{r.space_name}</strong>
                <div style={{ fontSize: 12, color: "#5A6178", marginTop: 4 }}>
                  ${r.price}/hr · Reserved {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => handleCancel(r.id)}
                style={{ background: "#fbe6e6", color: "#a33030", border: "none", padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}