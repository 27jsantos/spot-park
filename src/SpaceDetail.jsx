import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const FIT_COPY = {
  good: { label: "Good fit for your", color: "#2f7d3c", bg: "#e5f4e7" },
  tight: { label: "Tight fit for your", color: "#946200", bg: "#fdf1d8" },
  bad: { label: "Not recommended for your", color: "#a33030", bg: "#fbe6e6" },
};

function fitStatus(space, vehicle) {
  const wClear = space.width - vehicle.width;
  const lClear = space.length - vehicle.length;
  if (wClear < 0.5 || lClear < 1) return "bad";
  if (wClear < 1.5 || lClear < 2.5) return "tight";
  return "good";
}

export default function SpaceDetail({ space, vehicle, onBack }) {
  const [reserved, setReserved] = useState(false);
  const [saving, setSaving] = useState(false);
  const status = fitStatus(space, vehicle);
  const c = FIT_COPY[status];

  async function handleReserve() {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reservations").insert({
      user_id: user.id,
      space_name: space.name,
      price: space.price,
    });
    setSaving(false);
    if (error) {
      console.error(error);
      alert("Something went wrong saving your reservation.");
    } else {
      setReserved(true);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#C7CDD6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 24, color: "#1E2233" }}>
       {space.photo_url ? (
  <img src={space.photo_url} alt={space.name} style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: 12, marginBottom: 16 }} />
) : (
  <div style={{ height: 160, background: "#FFFFFF", border: "1px solid #B4BBC7", borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#5A6178", fontSize: 13 }}>
    Photo coming soon
  </div>
)}
        <button onClick={onBack} style={{ marginBottom: 16, background: "#FFFFFF", border: "1px solid #B4BBC7", borderRadius: 6, padding: "5px 10px", color: "#1E2233", cursor: "pointer" }}>
          ← Back
        </button>

        <h1 style={{ fontSize: 20, marginBottom: 4 }}>{space.name}</h1>
        <div style={{ fontSize: 13, color: "#5A6178", marginBottom: 12 }}>
          {space.distance} mi away · ⭐ {space.rating}
        </div>

        <span style={{ background: c.bg, color: c.color, fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
          {c.label} {vehicle.label.toLowerCase()}
        </span>

        <div style={{ margin: "16px 0", fontSize: 13, color: "#5A6178" }}>
          <div>Available: {space.hours}</div>
          <div>Space size: {space.width}' wide × {space.length}' deep</div>
        </div>

        <div style={{ background: "#FFFFFF", border: "1px solid #B4BBC7", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>${space.price}/hr</strong>
          <button
            onClick={handleReserve}
            disabled={saving || reserved}
            style={{ background: "#2F6FED", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
          >
            {reserved ? "Reserved ✓" : saving ? "Saving..." : "Reserve"}
          </button>
        </div>

        {reserved && (
          <div style={{ marginTop: 10, fontSize: 12, color: "#2f7d3c" }}>
            Your reservation was saved to your account.
          </div>
        )}
      </div>
    </div>
  );
}