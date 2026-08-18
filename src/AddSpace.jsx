import React, { useState } from "react";
import { supabase } from "./supabaseClient";

const inputStyle = { display: "block", width: "100%", padding: 10, marginTop: 4, border: "1px solid #B4BBC7", borderRadius: 8, background: "#FFFFFF", color: "#1E2233" };

export default function AddSpace({ onBack, onSaved }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [hours, setHours] = useState("");
  const [width, setWidth] = useState("");
  const [length, setLength] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handlePhotoChange(e) {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPreview(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();

    let photo_url = null;

    if (photoFile) {
      const fileExt = photoFile.name.split(".").pop();
      const filePath = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("space-photos")
        .upload(filePath, photoFile);

      if (uploadError) {
        setError(uploadError.message);
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("space-photos").getPublicUrl(filePath);
      photo_url = urlData.publicUrl;
    }

    const { error } = await supabase.from("spaces").insert({
      name,
      price: Number(price),
      distance: 0.1,
      hours,
      width: Number(width),
      length: Number(length),
      rating: 5.0,
      owner_id: user.id,
      photo_url,
    });

    setSaving(false);
    if (error) {
      setError(error.message);
    } else {
      onSaved();
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#C7CDD6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ maxWidth: 420, margin: "0 auto", padding: 24, color: "#1E2233" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#FFFFFF", border: "1px solid #B4BBC7", borderRadius: 6, padding: "5px 10px", color: "#1E2233", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16 }}>List Your Space</h1>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 13, color: "#5A6178" }}>
            Photo
            {preview ? (
              <img src={preview} alt="Preview" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: 8, marginTop: 6 }} />
            ) : (
              <div style={{ ...inputStyle, height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#5A6178" }}>
                No photo selected
              </div>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ marginTop: 8 }} />
          </label>

          <label style={{ fontSize: 13, color: "#5A6178" }}>
            Space name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Driveway on Oak St" required style={inputStyle} />
          </label>

          <label style={{ fontSize: 13, color: "#5A6178" }}>
            Price per hour ($)
            <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="6" required style={inputStyle} />
          </label>

          <label style={{ fontSize: 13, color: "#5A6178" }}>
            Available hours
            <input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="5 PM – 11 PM" required style={inputStyle} />
          </label>

          <label style={{ fontSize: 13, color: "#5A6178" }}>
            Width (feet)
            <input type="number" step="0.1" value={width} onChange={(e) => setWidth(e.target.value)} placeholder="9.0" required style={inputStyle} />
          </label>

          <label style={{ fontSize: 13, color: "#5A6178" }}>
            Length (feet)
            <input type="number" step="0.1" value={length} onChange={(e) => setLength(e.target.value)} placeholder="20.0" required style={inputStyle} />
          </label>

          {error && <div style={{ color: "#a33030", fontSize: 13 }}>{error}</div>}

          <button
            type="submit"
            disabled={saving}
            style={{ background: "#2F6FED", color: "#FFFFFF", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, cursor: "pointer", marginTop: 8 }}
          >
            {saving ? "Saving..." : "List This Space"}
          </button>
        </form>
      </div>
    </div>
  );
}