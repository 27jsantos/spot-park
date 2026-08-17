import React, { useState } from "react";
import { supabase } from "./supabaseClient";

export default function AddSpace({ onBack, onSaved }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

   const { data: { user } } = await supabase.auth.getUser();

const { error } = await supabase.from("spaces").insert({
  name,
  price: Number(price),
  distance: 0.1,
  hours,
  width: Number(width),
  length: Number(length),
  rating: 5.0,
  owner_id: user.id,
});

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      onSaved();
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif", padding: 16 }}>
      <button onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>List Your Space</h1>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          Space name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Driveway on Oak St" required style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
        </label>

        <label>
          Price per hour ($)
          <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="6" required style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
        </label>

        <label>
          Available hours
          <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="5 PM – 11 PM" required style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
        </label>

        <label>
          Width (feet)
          <input type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="9.0" required style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
        </label>

        <label>
          Length (feet)
          <input type="number" step="0.1" value={length} onChange={(e) => setLength(e.target.value)} placeholder="20.0" required style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
        </label>

        {error && <div style={{ color: "#a33030", fontSize: 13 }}>{error}</div>}

        <button
          type="submit"
          disabled={saving}
          style={{ background: "#2f7d3c", color: "white", border: "none", padding: 12, borderRadius: 8, fontWeight: "bold", marginTop: 8 }}
        >
          {saving ? "Saving..." : "List This Space"}
        </button>
      </form>
    </div>
  );
}