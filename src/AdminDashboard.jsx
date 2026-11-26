import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function AdminDashboard({ onBack }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: spaces } = await supabase.from("spaces").select("*");
      const { data: reservations } = await supabase.from("reservations").select("*");
      const { data: reports } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(20);

      const grossBookings = (reservations || [])
        .filter((r) => r.status === "paid" || !r.status)
        .reduce((sum, r) => sum + (r.price || 0), 0);

      setStats({
        totalSpaces: (spaces || []).length,
        totalReservations: (reservations || []).length,
        pendingRequests: (reservations || []).filter((r) => r.status === "pending").length,
        grossBookings,
        recentSpaces: (spaces || []).slice(-5).reverse(),
        reports: (reports || []).map((r) => ({ ...r, spaceName: r.space_id ? ((spaces || []).find((sp) => String(sp.id) === String(r.space_id)) || {}).name : null })),
      });
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 13 }}>
      <div style={{ width: "100%", maxWidth: 380, boxSizing: "border-box", background: "#0d2c64", borderRadius: 24, padding: 20, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", minHeight: 44, color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ textAlign: "center", fontSize: 24, marginBottom: 16, color: "#FFFFFF", fontWeight: 800, fontFamily: "'Playfair Display', serif", textDecoration: "underline" }}>Admin Dashboard</h1>

        {loading && <div style={{ color: "#B7C4DC" }}>Loading...</div>}

        {!loading && stats && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, textDecoration: "underline", color: "#000000" }}>Gross Bookings</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233" }}>${stats.grossBookings.toFixed(2)}</div>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, textDecoration: "underline", color: "#000000" }}>Reservations</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233" }}>{stats.totalReservations}</div>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, textDecoration: "underline", color: "#000000" }}>Active Spaces</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233" }}>{stats.totalSpaces}</div>
              </div>
              <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, textAlign: "center" }}>
                <div style={{ fontSize: 12, fontWeight: 800, textDecoration: "underline", color: "#000000" }}>Pending Requests</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233" }}>{stats.pendingRequests}</div>
              </div>
            </div>

            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, textAlign: "center", textDecoration: "underline", color: "#FFFFFF", margin: "0 0 12px" }}>{`Reports (${stats.reports.length})`}</h2>
            {stats.reports.length === 0 && <div style={{ color: "#B7C4DC", fontSize: 13, textAlign: "center", marginBottom: 12 }}>No reports yet.</div>}
            {stats.reports.map((r) => (
              <div key={r.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 8, color: "#000000", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#1E2233" }}>{r.message_id ? "Reported Message" : "Reported Listing"}{r.spaceName ? ` — ${r.spaceName}` : ""}</div>
                <div style={{ fontSize: 14, marginTop: 4 }}>{r.reason}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>{new Date(r.created_at).toLocaleString()}{r.reported_user_id ? `  ·  User ${String(r.reported_user_id).slice(0, 8)}` : ""}</div>
              </div>
            ))}

            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, textAlign: "center", textDecoration: "underline", color: "#FFFFFF", margin: "0 0 12px" }}>Recent Spaces</h2>
            {stats.recentSpaces.map((s) => (
              <div key={s.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 8, fontSize: 15, fontWeight: 700, color: "#1E2233", textAlign: "center" }}>
                <strong>{s.name}</strong> — ${s.price}/hr
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}