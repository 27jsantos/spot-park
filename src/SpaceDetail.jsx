import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const FIT_COPY = {
  good: { label: "Good fit for your", ring: "#639922", bg: "#EAF3DE", text: "#3B6D11" },
  tight: { label: "Tight fit for your", ring: "#EF9F27", bg: "#FAEEDA", text: "#854F0B" },
  bad: { label: "Not recommended for your", ring: "#E24B4A", bg: "#FCEBEB", text: "#791F1F" },
};

function fitStatus(space, vehicle) {
  const wClear = space.width - vehicle.width;
  const lClear = space.length - vehicle.length;
  if (wClear < 0.5 || lClear < 1) return "bad";
  if (wClear < 1.5 || lClear < 2.5) return "tight";
  return "good";
}

function FitVisual({ space, vehicle, status }) {
  const c = FIT_COPY[status];
  const wScale = 160 / space.width;
  const vw = vehicle.width * wScale;
  const vl = (vehicle.length / space.length) * 220;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
      <svg width="180" height="240" viewBox="0 0 180 240">
        <rect x="10" y="10" width="160" height="220" rx="4" fill="none" stroke="#3B4F73" strokeWidth="2" strokeDasharray="6 5" />
        <rect x={90 - vw / 2} y={125 - vl / 2} width={vw} height={vl} rx={vw / 3} fill={c.ring} opacity="0.9" />
        <rect x={90 - vw / 2 + 6} y={125 - vl / 2 + 10} width={vw - 12} height={vl * 0.28} rx="4" fill="#FFFFFF" opacity="0.5" />
      </svg>
    </div>
  );
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
      space_id: space.id,
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
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, overflow: "hidden", border: "1px solid #3B4F73", height: "fit-content" }}>

        {space.photo_url ? (
          <img src={space.photo_url} alt={space.name} style={{ width: "100%", height: 190, objectFit: "cover" }} />
        ) : (
          <div style={{ height: 190, background: "#3B4F73", display: "flex", alignItems: "center", justifyContent: "center", color: "#B7C4DC", fontSize: 13 }}>
            Photo coming soon
          </div>
        )}

        <div style={{ padding: 16, color: "#FFFFFF" }}>
          <button onClick={onBack} style={{ marginBottom: 12, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
            ← Back
          </button>

          <h1 style={{ fontSize: 19, margin: "0 0 4px", fontWeight: 800 }}>{space.name}</h1>
          <div style={{ fontSize: 13, color: "#B7C4DC", marginBottom: 12 }}>
            {space.distance} mi away · ⭐ {space.rating}
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "6px 14px 16px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", background: c.bg, color: c.text, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, marginTop: 12 }}>
              {c.label} {vehicle.label.toLowerCase()}
            </div>
            <FitVisual space={space} vehicle={vehicle} status={status} />
            <div style={{ display: "flex", justifyContent: "space-around", fontSize: 12, color: "#5A6178" }}>
              <div>{space.width}' wide</div>
              <div>{space.length}' deep</div>
            </div>
          </div>

          <div style={{ margin: "14px 0", fontSize: 13, color: "#B7C4DC" }}>
            Available: {space.hours}
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <strong style={{ color: "#1E2233" }}>${space.price}/hr</strong>
            <button
              onClick={handleReserve}
              disabled={saving || reserved}
              style={{ background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
            >
              {reserved ? "Reserved ✓" : saving ? "Saving..." : "Reserve"}
            </button>
          </div>

          {reserved && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#B7C4DC", textAlign: "center" }}>
              Your reservation was saved to your account.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}