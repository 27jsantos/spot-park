import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import SpaceDetail from "./SpaceDetail";
import VehicleProfile from "./VehicleProfile";
import Auth from "./Auth";
import AddSpace from "./AddSpace";
import HostDashboard from "./HostDashboard";
import MyReservations from "./MyReservations";
import { supabase } from "./supabaseClient";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_VEHICLE = { id: "suv", label: "SUV", width: 6.5, length: 16.8 };
const DEFAULT_CENTER = [40.6546, -73.5594];

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

function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
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
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [searchText, setSearchText] = useState("");
  const [mapView, setMapView] = useState("street");

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchText.trim()) return;
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchText)}`);
    const results = await res.json();
    if (results.length > 0) {
      setMapCenter([parseFloat(results[0].lat), parseFloat(results[0].lon)]);
    } else {
      alert("Couldn't find that address.");
    }
  }

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

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  }, []);

  async function loadSpaces() {
    setLoading(true);
    const { data, error } = await supabase.from("spaces").select("*");
    if (error) console.error("Error loading spaces:", error);
    else setSpaces(data);

    const { data: reviewData, error: reviewError } = await supabase.from("reviews").select("space_id, rating");
    if (!reviewError && reviewData) {
      const grouped = {};
      reviewData.forEach((r) => {
        if (!grouped[r.space_id]) grouped[r.space_id] = [];
        grouped[r.space_id].push(r.rating);
      });
      const averages = {};
      Object.keys(grouped).forEach((spaceId) => {
        const nums = grouped[spaceId];
        averages[spaceId] = {
          avg: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1),
          count: nums.length,
        };
      });
      setRatings(averages);
    }

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
    return (
      <SpaceDetail
        space={selectedSpace}
        vehicle={vehicle}
        onBack={() => setSelectedSpace(null)}
        ratingInfo={ratings[selectedSpace.id]}
      />
    );
  }

  const spacesWithLocation = spaces.filter((s) => s.latitude && s.longitude);

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, overflow: "hidden", border: "1px solid #3B4F73", height: "fit-content" }}>

        <div style={{ height: 220, position: "relative" }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }}>
            {mapView === "street" ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            ) : (
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            )}
            <RecenterMap center={mapCenter} />
            {spacesWithLocation.map((s) => (
              <Marker key={s.id} position={[s.latitude, s.longitude]}>
                <Popup>
                  <strong>{s.name}</strong><br />${s.price}/hr
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          <form
            onSubmit={handleSearch}
            style={{ position: "absolute", top: 16, left: 16, right: 16, background: "#FFFFFF", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 6px rgba(0,0,0,0.15)", zIndex: 1000 }}
          >
            <span style={{ fontSize: 14 }}>🔍</span>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search an address"
              style={{ border: "none", outline: "none", fontSize: 13, color: "#1E2233", flex: 1, background: "transparent" }}
            />
          </form>

          <button
            onClick={() => setMapView(mapView === "street" ? "satellite" : "street")}
            style={{ position: "absolute", bottom: 10, right: 10, background: "#FFFFFF", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#1E2233", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 1000 }}
          >
            {mapView === "street" ? "🛰 Satellite" : "🗺 Map"}
          </button>

          {!loading && spacesWithLocation.length === 0 && (
            <div style={{ position: "absolute", bottom: 10, left: 10, right: 90, background: "#FFFFFF", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#5A6178", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", zIndex: 1000 }}>
              No spaces near you yet — be the first to list one!
            </div>
          )}
        </div>

        <div style={{ padding: 16, color: "#FFFFFF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 800 }}>Spot Aura</span>
            <button
              onClick={() => supabase.auth.signOut().then(() => setUser(null))}
              style={{ background: "none", border: "1px solid #3B4F73", color: "#B7C4DC", fontSize: 11, padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}
            >
              Log out
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 14px" }}>
            <span style={{ fontSize: 13, color: "#B7C4DC" }}>Driving: <strong style={{ color: "#FFFFFF" }}>{vehicle.label}</strong></span>
            <button onClick={() => setEditingVehicle(true)} style={{ background: "#3B4F73", border: "none", color: "#FFFFFF", fontSize: 12, padding: "5px 10px", borderRadius: 6, cursor: "pointer" }}>
              Edit
            </button>
          </div>

          <button
            onClick={() => setAddingSpace(true)}
            style={{ width: "100%", background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 11, borderRadius: 10, marginBottom: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            + List a Space
          </button>
          <button
            onClick={() => setViewingDashboard(true)}
            style={{ width: "100%", background: "#3B4F73", color: "#FFFFFF", border: "none", padding: 11, borderRadius: 10, marginBottom: 8, fontSize: 13, cursor: "pointer" }}
          >
            My Host Dashboard
          </button>
          <button
            onClick={() => setViewingReservations(true)}
            style={{ width: "100%", background: "#3B4F73", color: "#FFFFFF", border: "none", padding: 11, borderRadius: 10, marginBottom: 16, fontSize: 13, cursor: "pointer" }}
          >
            My Reservations
          </button>

          {loading && <div style={{ color: "#B7C4DC", fontSize: 13 }}>Loading spaces...</div>}

          {!loading && spaces.map((s) => {
            const status = fitStatus(s, vehicle);
            const c = FIT_COPY[status];
            const ratingInfo = ratings[s.id];
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSpace(s)}
                style={{ background: "#FFFFFF", border: "none", borderRadius: 14, padding: 12, marginBottom: 10, cursor: "pointer", display: "flex", gap: 12 }}
              >
                <FitDiagram status={status} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: 14, color: "#1E2233" }}>{s.name}</strong>
                    <span style={{ fontSize: 14, color: "#1E2233" }}>${s.price}/hr</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#5A6178", margin: "3px 0" }}>
                    {s.distance} mi · {s.hours} · ⭐ {ratingInfo ? `${ratingInfo.avg} (${ratingInfo.count})` : "No ratings yet"}
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