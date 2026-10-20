import React, { useState, useEffect, useRef } from "react";

function makeLabel(p) {
  const street = [p.housenumber, p.street].filter(Boolean).join(" ");
  const place = p.city || p.town || p.village || p.district || p.county;
  const parts = [p.name, street, place, p.state, p.postcode].filter(Boolean);
  return parts.filter((x, i) => parts.indexOf(x) === i).join(", ");
}

function withTimeout(url, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

function nominatimLabel(r) {
  const a = r.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const place = a.city || a.town || a.village || a.hamlet || a.county;
  const parts = [street, place, a.state, a.postcode].filter(Boolean);
  return parts.length > 1 ? parts.join(", ") : r.display_name;
}

// Tries Photon first, and falls back to OpenStreetMap Nominatim if Photon is slow or down
async function lookup(text, limit) {
  try {
    const res = await withTimeout(`https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=${limit}&lang=en`, 3500);
    const data = await res.json();
    const list = (data.features || [])
      .map((f) => ({ label: makeLabel(f.properties || {}), lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0] }))
      .filter((r) => r.label);
    if (list.length > 0) return list;
  } catch (e) {}
  const res = await withTimeout(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&countrycodes=us&limit=${limit}`, 6000);
  const data = await res.json();
  return (data || [])
    .map((r) => ({ label: nominatimLabel(r), lat: parseFloat(r.lat), lng: parseFloat(r.lon) }))
    .filter((r) => r.label && !isNaN(r.lat));
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
        const list = await lookup(text, 5);
        if (id !== requestId.current) return;
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
