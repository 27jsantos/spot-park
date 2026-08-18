import React, { useState, useEffect } from "react";
import SpaceDetail from "./SpaceDetail";
import VehicleProfile from "./VehicleProfile";
import Auth from "./Auth";
import AddSpace from "./AddSpace";
import HostDashboard from "./HostDashboard";
import MyReservations from "./MyReservations";
import { supabase } from "./supabaseClient";

const DEFAULT_VEHICLE = { id: "suv", label: "SUV", width: 6.5, length: 16.8 };

function fitStatus(space, vehicle) {
  const wClear = space.width - vehicle.width;
  const lClear = space.length - vehicle.length;
  if (wClear < 0.5 || lClear < 1) return "bad";
  if (wClear < 1.5 || lClear < 2.5) return "tight";
  return "good";
}

const FIT_COPY = {
  good: { label: "Fits your", ring: "#639922", bg: "#EAF3DE", text: "#3B6D11" },
  tight: { label: "Tight fit for your", ring: "#EF9F27", bg: "#FAEEDA", text: "#854F0B" },
  bad: { label: "Not recommended for your", ring: "#E24B4A", bg: "#FCEBEB", text: "#791F1F" },
};

function FitDiagram({ status }) {
  const c = FIT_COPY[status];
  return (
    <svg width="40" height="52" viewBox="0 0 40 52" style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="38" height="50" rx="3" fill="none" stroke={c.ring} strokeWidth="2" />
      <rect x="9" y="9" width="22" height="34" rx="6" fill={c.ring} opacity="0.85" />
      <rect x="11.5" y="13" width="17" height="9" rx="2" fill="#FFFFFF" opacity="0.5" />
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [vehicle, setVehicle] = useState(DEFAULT_VEHICLE);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [editingVehicle, setEditingVehicle] = useState(false);
  const [addingSpace, setAddingSpace] = useState(false);
  const [viewingDashboard, setViewingDashboard] = useState(false);
  const [viewingReservations, setViewingReservations] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const sessionUser = data.session ? data.session.user : null;
      setUser(sessionUser);
      if (sessionUser?.user_metadata?.vehicle) {
        setVehicle(sessionUser.user_metadata.vehicle);
      }
      setCheckingSession(false);
    });
  }, []);

  async function loadSpaces() {
    setLoading(true);
    const { data, error } = await supabase.from("spaces").select("*");
    if (error) console.error("Error loading spaces:", error);
    else setSpaces(data);
    setLoading(false);
  }

  useEffect(() => {
    if (user) loadSpaces();
  }, [user]);

  if (checkingSession) return null;
  if (!user) return <Auth onLoggedIn={(u) => setUser(u)} />;

  if (addingSpace) {
    return (
      <AddSpace
        onBack={() => setAddingSpace(false)}
        onSaved={() => {
          setAddingSpace(false);
          loadSpaces();
        }}
      />
    );
  }

  if (viewingDashboard) return <HostDashboard onBack={() => setViewingDashboard(false)} />;
  if (viewingReservations) return <MyReservations onBack={() => setViewingReservations(false)} />;

  if (editingVehicle) {
    return (
      <VehicleProfile
        onBack={() => setEditingVehicle(false)}
        onSave={(v) => {
          setVehicle(v);
          setEditingVehicle(false);
        }}
      />
    );
  }

  if (selectedSpace) {
    return <SpaceDetail space={selectedSpace} vehicle={vehicle} onBack={() => setSelectedSpace(null)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#C7CDD6", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#C7CDD6", borderRadius: 24, overflow: "hidden", border: "1px solid #B4BBC7", height: "fit-content" }}>

        <div style={{ position: "relative", height: 190, background: "linear-gradient(180deg,#DCE1E7 0%,#CBD1D9 100%)", overflow: "hidden" }}>
          <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.5 }}>
            <line x1="0" y1="70" x2="380" y2="70" stroke="#9AA3B0" strokeWidth="1.5" />
            <line x1="0" y1="140" x2="380" y2="140" stroke="#9AA3B0" strokeWidth="1.5" />
            <line x1="110" y1="0" x2="90" y2="190" stroke="#9AA3B0" strokeWidth="1.5" />
            <line x1="260" y1="0" x2="290" y2="190" stroke="#9AA3B0" strokeWidth="1.5" />
          </svg>

          {spaces.slice(0, 6).map((s, i) => {
            const positions = [
              { top: "35%", left: "28%" }, { top: "60%", left: "62%" }, { top: "22%", left: "70%" },
              { top: "72%", left: "22%" }, { top: "48%", left: "45%" }, { top: "18%", left: "48%" },
            ];
            const pos = positions[i] || positions[0];
            return (
              <button
                key={s.id}
                onClick={() => setSelectedSpace(s)}
                style={{ position: "absolute", top: pos.top, left: pos.left, transform: "translate(-50%,-100%)", background: "#2F6FED", color: "#FFFFFF", border: "none", borderRadius: 20, padding: "5px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}
              >
                ${s.price}
              </button>
            );
          })}

          <div style={{ position: "absolute", top: 16, left: 16, right: 16, background: "#FFFFFF", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.08)" }}>
            <span style={{ fontSize: 13, color: "#5A6178" }}>🔍 Search an address</span>
          </div>
        </div>

        <div style={{ padding: 16, color: "#1E2233" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Spot Park</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => setUser(null))}
              style={{ background: "none", border: "1px solid #B4BBC7", color: "#5A6178", fontSize: 11, padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}
            >
              Log out
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 14px" }}>
            <span style={{ fontSize: 13, color: "#5A6178" }}>Driving: <strong style={{ color: "#1E2233" }}>{vehicle.label}</strong></span>
            <button onClick={() => setEditingVehicle(true)} style={{ background: "#FFFFFF", border: "1px solid #B4BBC7", color: "#1E2233", fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>
              Edit
            </button>
          </div>

          <button
            onClick={() => setAddingSpace(true)}
            style={{ width: "100%", background: "#2F6FED", color: "#FFFFFF", border: "none", padding: 11, borderRadius: 10, marginBottom: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            + List a Space
          </button>
          <button
            onClick={() => setViewingDashboard(true)}
            style={{ width: "100%", background: "#FFFFFF", color: "#1E2233", border: "1px solid #B4BBC7", padding: 11, borderRadius: 10, marginBottom: 8, fontSize: 13, cursor: "pointer" }}
          >
            My Host Dashboard
          </button>
          <button
            onClick={() => setViewingReservations(true)}
            style={{ width: "100%", background: "#FFFFFF", color: "#1E2233", border: "1px solid #B4BBC7", padding: 11, borderRadius: 10, marginBottom: 16, fontSize: 13, cursor: "pointer" }}
          >
            My Reservations
          </button>

          {loading && <div style={{ color: "#5A6178", fontSize: 13 }}>Loading spaces...</div>}

          {!loading && spaces.map((s) => {
            const status = fitStatus(s, vehicle);
            const c = FIT_COPY[status];
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSpace(s)}
                style={{ background: "#FFFFFF", border: "1px solid #B4BBC7", borderRadius: 14, padding: 12, marginBottom: 10, cursor: "pointer", display: "flex", gap: 12 }}
              >
                <FitDiagram status={status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: 14 }}>{s.name}</strong>
                    <span style={{ fontSize: 14 }}>${s.price}/hr</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#5A6178", margin: "3px 0" }}>
                    {s.distance} mi · {s.hours} · ⭐ {s.rating}
                  </div>
                  <span style={{ background: c.bg, color: c.text, fontSize: 11, padding: "3px 9px", borderRadius: 20, fontWeight: 700 }}>
                    {c.label} {vehicle.label.toLowerCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}