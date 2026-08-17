import React, { useState } from "react";

const BODY_TYPES = {
  sedan: { label: "Sedan", width: 6.0, length: 15.5 },
  suv: { label: "SUV", width: 6.5, length: 16.8 },
  truck: { label: "Pickup truck", width: 6.7, length: 19.5 },
  van: { label: "Minivan", width: 6.6, length: 17.5 },
};

export default function VehicleProfile({ onSave, onBack }) {
  const [year, setYear] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [bodyType, setBodyType] = useState("suv");

  function handleSave() {
    const dims = BODY_TYPES[bodyType];
    onSave({
      id: bodyType,
      label: `${year} ${make} ${model}`.trim() || dims.label,
      width: dims.width,
      length: dims.length,
    });
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", fontFamily: "sans-serif", padding: 16 }}>
      <button onClick={onBack} style={{ marginBottom: 16 }}>← Back</button>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>My Vehicle</h1>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <label>
          Year
          <input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2021" style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
        </label>

        <label>
          Make
          <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Ford" style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
        </label>

        <label>
          Model
          <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="F-150" style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }} />
        </label>

        <label>
          Body type
          <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} style={{ display: "block", width: "100%", padding: 8, marginTop: 4 }}>
            {Object.entries(BODY_TYPES).map(([id, v]) => (
              <option key={id} value={id}>{v.label}</option>
            ))}
          </select>
        </label>

        <button
          onClick={handleSave}
          style={{ background: "#2f7d3c", color: "white", border: "none", padding: "12px 20px", borderRadius: 8, marginTop: 8 }}
        >
          Save Vehicle
        </button>
      </div>
    </div>
  );
}
