import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

const inputStyle = { display: "block", width: "100%", padding: 8, marginTop: 4, border: "1px solid #3B4F73", borderRadius: 6, background: "#FFFFFF", color: "#1E2233", fontSize: 13 };

export default function HostDashboard({ onBack }) {
  const [mySpaces, setMySpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase.from("spaces").select("*").eq("owner_id", user.id);
    if (error) console.error(error);
    else setMySpaces(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    const confirmed = window.confirm("Remove this space from Spot Park?");
    if (!confirmed) return;
    const { error } = await supabase.from("spaces").delete().eq("id", id);
    if (error) {
      alert("Something went wrong deleting this space.");
      console.error(error);
    } else {
      load();
    }
  }

  function startEditing(space) {
    setEditingId(space.id);
    setEditForm({
      name: space.name,
      price: space.price,
      hours: space.hours,
      width: space.width,
      length: space.length,
    });
  }

  async function handleSaveEdit(id) {
    setSaving(true);
    const { error } = await supabase
      .from("spaces")
      .update({
        name: editForm.name,
        price: Number(editForm.price),
        hours: editForm.hours,
        width: Number(editForm.width),
        length: Number(editForm.length),
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      alert("Something went wrong saving your changes.");
      console.error(error);
    } else {
      setEditingId(null);
      load();
    }
  }

  const totalPossibleEarnings = mySpaces.reduce((sum, s) => sum + s.price, 0);

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, padding: 20, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: "#FFFFFF"}}>My Host Dashboard</h1>

        <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <div style={{ fontSize: 13, color: "#5A6178" }}>Your listed spaces</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2233" }}>{mySpaces.length}</div>
          <div style={{ fontSize: 13, color: "#5A6178", marginTop: 8 }}>Combined hourly rate</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#1E2233" }}>${totalPossibleEarnings}/hr</div>
        </div>

        {loading && <div style={{ color: "#B7C4DC" }}>Loading...</div>}

        {!loading && mySpaces.length === 0 && (
          <div style={{ color: "#B7C4DC", fontSize: 14 }}>
            You haven't listed any spaces yet. Go back and tap "+ List a Space" to add one.
          </div>
        )}

        {!loading && mySpaces.map((s) => (
          <div key={s.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 10 }}>
            {editingId === s.id ? (
              <div>
                <label style={{ fontSize: 12, color: "#5A6178" }}>
                  Name
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, color: "#5A6178" }}>
                  Price per hour ($)
                  <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, color: "#5A6178" }}>
                  Available hours
                  <input value={editForm.hours} onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })} style={inputStyle} />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ fontSize: 12, color: "#5A6178", flex: 1 }}>
                    Width (ft)
                    <input type="number" step="0.1" value={editForm.width} onChange={(e) => setEditForm({ ...editForm, width: e.target.value })} style={inputStyle} />
                  </label>
                  <label style={{ fontSize: 12, color: "#5A6178", flex: 1 }}>
                    Length (ft)
                    <input type="number" step="0.1" value={editForm.length} onChange={(e) => setEditForm({ ...editForm, length: e.target.value })} style={inputStyle} />
                  </label>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    onClick={() => handleSaveEdit(s.id)}
                    disabled={saving}
                    style={{ flex: 1, background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 8, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{ flex: 1, background: "#E5E7EB", color: "#1E2233", border: "none", padding: 8, borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong style={{ color: "#1E2233" }}>{s.name}</strong>
                  <div style={{ fontSize: 13, color: "#5A6178", marginTop: 4 }}>
                    ${s.price}/hr · {s.hours} · {s.width}' × {s.length}'
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => startEditing(s)}
                    style={{ background: "#E8ECFB", color: "#2A4FA0", border: "none", padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    style={{ background: "#fbe6e6", color: "#a33030", border: "none", padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}