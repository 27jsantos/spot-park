import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const BODY_TYPES = {
  sedan: { label: "Sedan", width: 6.0, length: 15.5 },
  suv: { label: "SUV", width: 6.5, length: 16.8 },
  truck: { label: "Pickup truck", width: 6.7, length: 19.5 },
  van: { label: "Minivan", width: 6.6, length: 17.5 },
};

const inputStyle = { display: "block", width: "100%", padding: 10, marginTop: 4, border: "1px solid #3B4F73", borderRadius: 8, background: "#FFFFFF", color: "#1E2233" };

export default function VehicleProfile({ onSave, onBack }) {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [bodyType, setBodyType] = useState("suv");

  async function handleSave() {
    const dims = BODY_TYPES[bodyType];
    const vehicle = {
      id: bodyType,
      label: `${year} ${make} ${model}`.trim() || dims.label,
      width: dims.width,
      length: dims.length,
    };
    await supabase.auth.updateUser({ data: { vehicle } });
    onSave(vehicle);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, padding: 20, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: "#FFFFFF", fontWeight: 800 }}>My Vehicle</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, color: "#B7C4DC" }}>
            Year
            <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2021" style={inputStyle} />
          </label>
          <label style={{ fontSize: 13, color: "#B7C4DC" }}>
            Make
            <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Ford" style={inputStyle} />
          </label>
          <label style={{ fontSize: 13, color: "#B7C4DC" }}>
            Model
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="F-150" style={inputStyle} />
          </label>
          <label style={{ fontSize: 13, color: "#B7C4DC" }}>
            Body type
            <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} style={inputStyle}>
              {Object.entries(BODY_TYPES).map(([id, v]) => (
                <option key={id} value={id}>{v.label}</option>
              ))}
            </select>
          </label>
          <button
            onClick={handleSave}
            style={{ background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, cursor: "pointer", marginTop: 8 }}
          >
            Save Vehicle
          </button>
        </div>
      </div>
    </div>
  );
}