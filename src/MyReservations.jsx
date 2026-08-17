import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function MyReservations({ onBack }) {
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
    load();
  }, []);

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif", padding: 16 }}>
      <button onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>My Reservations</h1>

      {loading && <div>Loading...</div>}

      {!loading && reservations.length === 0 && (
        <div style={{ color: "#666", fontSize: 14 }}>
          You haven't reserved a space yet.
        </div>
      )}

      {!loading && reservations.map((r) => (
        <div key={r.id} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{r.space_name}</strong>
            <span>${r.price}/hr</span>
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            Reserved {new Date(r.created_at).toLocaleDateString()}
          </div>
        </div>
      ))}
    </div>
  );
}