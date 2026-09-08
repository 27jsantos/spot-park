import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function AdminDashboard({ onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: spaces } = await supabase.from("spaces").select("*");
      const { data: reservations } = await supabase.from("reservations").select("*");

      const grossBookings = (reservations || [])
        .filter((r) => r.status === "paid" || !r.status)
        .reduce((sum, r) => sum + (r.price || 0), 0);

      setStats({
        totalSpaces: (spaces || []).length,
        totalReservations: (reservations || []).length,
        pendingRequests: (reservations || []).filter((r) => r.status === "pending").length,
        grossBookings,
        recentSpaces: (spaces || []).slice(-5).reverse(),
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, padding: 20, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: "#FFFFFF", fontWeight: 800 }}>Admin Dashboard</h1>

        {loading && <div style={{ color: "#B7C4DC" }}>Loading...</div>}

        {!loading && stats && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#5A6178" }}>Gross Bookings</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233" }}>${stats.grossBookings.toFixed(2)}</div>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#5A6178" }}>Reservations</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233" }}>{stats.totalReservations}</div>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#5A6178" }}>Active Spaces</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233" }}>{stats.totalSpaces}</div>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 11, color: "#5A6178" }}>Pending Requests</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233" }}>{stats.pendingRequests}</div>
              </div>
            </div>

            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Recent Spaces</h2>
            {stats.recentSpaces.map((s) => (
              <div key={s.id} style={{ background: "#FFFFFF", borderRadius: 10, padding: 10, marginBottom: 8, fontSize: 12, color: "#1E2233" }}>
                <strong>{s.name}</strong> — ${s.price}/hr
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}