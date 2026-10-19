import React, { useState, useEffect, useRef } from "react";

function makeLabel(p) {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const place = p.city || p.town || p.village || p.district || p.county;
  const parts = [p.name, street, place, p.state, p.postcode].filter(Boolean);
  return parts.filter((x, i) => parts.indexOf(x) === i).join(", ");
}

export default function AddressInput({ value, onChange, onPick, placeholder, inputStyle, containerStyle }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const skipNext = useRef(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const text = (value || "").trim();
    if (text.length < 3) {
      setResults([]);
      return;
    }
    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=5&lang=en`);
        const data = await res.json();
        if (id !== requestId.current) return;
        const list = (data.features || []).map((f) => ({
          label: makeLabel(f.properties || {}),
          lat: f.geometry.coordinates[1],
          lng: f.geometry.coordinates[0],
        })).filter((r) => r.label);
        setResults(list);
        setOpen(list.length > 0);
      } catch (e) {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [value]);

  function pick(r) {
    skipNext.current = true;
    setOpen(false);
    setResults([]);
    onPick(r);
  }

  return (
    <div style={{ position: "relative", ...containerStyle }}>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        style={inputStyle}
      />
      {open && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4, background: "#FFFFFF", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.25)", zIndex: 2000, overflow: "hidden" }}>
          {results.map((r, i) => (
            <div
              key={i}
              onMouseDown={(e) => { e.preventDefault(); pick(r); }}
              style={{ padding: "8px 10px", fontSize: 12, color: "#1E2233", cursor: "pointer", borderBottom: i < results.length - 1 ? "1px solid #E5E7EB" : "none" }}
            >
              📍 {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
