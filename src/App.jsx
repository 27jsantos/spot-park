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
  good: { label: "Fits your", color: "#2f7d3c", bg: "#e5f4e7" },
  tight: { label: "Tight fit for your", color: "#946200", bg: "#fdf1d8" },
  bad: { label: "Not recommended for your", color: "#a33030", bg: "#fbe6e6" },
};

const page = { minHeight: "100vh", background: "#C7CDD6, fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" };
const card = { maxWidth: 420, margin: "0 auto", padding: 24, color: "#1E2233" };

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
      setUser(data.session ? data.session.user : null);
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
    <div style={page}>
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>Spot Park</h1>
          <button
            onClick={() => supabase.auth.signOut().then(() => setUser(null))}
            style={{ background: "#FFFFFF", border: "1px solid #DADEE5", color: "#5A6178", fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}
          >
            Log out
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "16px 0" }}>
          <span style={{ color: "#5A6178" }}>Driving: <strong style={{ color: "#1E2233" }}>{vehicle.label}</strong></span>
          <button onClick={() => setEditingVehicle(true)} style={{ background: "#FFFFFF", border: "1px solid #DADEE5", color: "#1E2233", padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>
            Edit
          </button>
        </div>

        <button
          onClick={() => setAddingSpace(true)}
          style={{ width: "100%", background: "#2F6FED", color: "#FFFFFF", border: "none", padding: 12, borderRadius: 10, marginBottom: 10, fontWeight: 700, cursor: "pointer" }}
        >
          + List a Space
        </button>

        <button
          onClick={() => setViewingDashboard(true)}
          style={{ width: "100%", background: "#FFFFFF", color: "#1E2233", border: "1px solid #DADEE5", padding: 12, borderRadius: 10, marginBottom: 10, cursor: "pointer" }}
        >
          My Host Dashboard
        </button>

        <button
          onClick={() => setViewingReservations(true)}
          style={{ width: "100%", background: "#FFFFFF", color: "#1E2233", border: "1px solid #DADEE5", padding: 12, borderRadius: 10, marginBottom: 20, cursor: "pointer" }}
        >
          My Reservations
        </button>

        {loading && <div style={{ color: "#5A6178" }}>Loading spaces...</div>}

        {!loading && spaces.map((s) => {
          const status = fitStatus(s, vehicle);
          const c = FIT_COPY[status];
          return (
            <div
              key={s.id}
              onClick={() => setSelectedSpace(s)}
              style={{ background: "#FFFFFF", border: "1px solid #DADEE5", borderRadius: 14, padding: 14, marginBottom: 10, cursor: "pointer" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>{s.name}</strong>
                <span>${s.price}/hr</span>
              </div>
              <div style={{ fontSize: 13, color: "#5A6178", margin: "4px 0" }}>
                {s.distance} mi · {s.hours} · ⭐ {s.rating}
              </div>
              <span style={{ background: c.bg, color: c.color, fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                {c.label} {vehicle.label.toLowerCase()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}