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
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif", padding: 16 }}>
      <div style={{ height: 160, background: "#e8e8e8", borderRadius: 10, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 13 }}>
        Photo coming soon
      </div>

      <button onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>

      <h1 style={{ fontSize: 20, marginBottom: 4 }}>{space.name}</h1>
      <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>
        {space.distance} mi away · ⭐ {space.rating}
      </div>

      <span style={{ background: c.bg, color: c.color, fontSize: 12, padding: "3px 8px", borderRadius: 12 }}>
        {c.label} {vehicle.label.toLowerCase()}
      </span>

      <div style={{ margin: "16px 0", fontSize: 13, color: "#444" }}>
        <div>Available: {space.hours}</div>
        <div>Space size: {space.width}' wide × {space.length}' deep</div>
      </div>

      <div style={{ borderTop: "1px solid #eee", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>${space.price}/hr</strong>
        <button
          onClick={handleReserve}
          disabled={saving || reserved}
          style={{ background: "#2f7d3c", color: "white", border: "none", padding: "10px 20px", borderRadius: 8 }}
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
  );
}