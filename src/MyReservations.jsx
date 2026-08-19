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
    <div style={{ minHeight: "100vh", background: "#9AA3B0", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 24, color: "#1E2233" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#FFFFFF", border: "1px solid #8791A0", borderRadius: 6, padding: "5px 10px", color: "#1E2233", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>My Reservations</h1>

        {loading && <div style={{ color: "#5A6178" }}>Loading...</div>}

        {!loading && reservations.length === 0 && (
          <div style={{ color: "#5A6178", fontSize: 14 }}>
            You haven't reserved a space yet.
          </div>
        )}

        {!loading && reservations.map((r) => (
          <div key={r.id} style={{ background: "#FFFFFF", border: "1px solid #8791A0", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong>{r.space_name}</strong>
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