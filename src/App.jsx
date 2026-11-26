import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import { fetchPlaces } from "./places";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import SpaceDetail from "./SpaceDetail";
import { unreadSummary, loadHostReviews, requestCounts } from "./unread";
import AddressInput from "./AddressInput";
import VehicleProfile from "./VehicleProfile";
import Auth from "./Auth";
import AddSpace from "./AddSpace";
import HostDashboard from "./HostDashboard";
import MyReservations from "./MyReservations";
import AdminDashboard from "./AdminDashboard";
import PrivacyPolicy from "./PrivacyPolicy";
import TermsOfService from "./TermsOfService";
import { supabase } from "./supabaseClient";

const ADMIN_USER_ID = "95827d6e-d632-4807-bb8e-90c693998120";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const redPin = L.divIcon({
  className: "",
  html: '<svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg"><path d="M15 1C7.3 1 1 7.2 1 14.8 1 25 15 41 15 41s14-16 14-26.2C29 7.2 22.7 1 15 1z" fill="#FF3B30" stroke="#B3261E" stroke-width="1.5"/><circle cx="15" cy="14.5" r="5.5" fill="#FFFFFF" opacity="0.9"/></svg>',
  iconSize: [30, 42],
  iconAnchor: [15, 41],
  popupAnchor: [0, -38],
});

const blueDot = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;border-radius:50%;background:#007AFF;border:3px solid #FFFFFF;box-shadow:0 0 0 2px rgba(0,122,255,0.35)"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
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

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const trainIconFor = (name, zoom) => {
  const big = zoom >= 15;
  const d = big ? 22 : 16;
  const label = big ? `<div style="margin-top:2px;background:#FFD60A;color:#000;font-weight:800;font-size:10px;padding:1px 5px;border-radius:5px;max-width:110px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${esc(name)}</div>` : "";
  const html = `<div style="display:flex;flex-direction:column;align-items:center;width:110px;margin-left:${-(55 - d / 2)}px"><div style="font-size:${big ? 11 : 8}px;background:#1D4ED8;border:3px solid #FFD60A;border-radius:50%;width:${d}px;height:${d}px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.5)">🚆</div>${label}</div>`;
  return L.divIcon({ className: "", html, iconSize: [d, big ? 46 : d], iconAnchor: [d / 2, d / 2] });
};

const landmarkIcon = L.divIcon({ className: "", html: `<div style="font-size:16px;background:#F97316;border:3px solid #FFFFFF;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.55)">⭐</div>`, iconSize: [32, 32], iconAnchor: [16, 16] });

function PlacesLayer({ onStatus }) {
  const map = useMap();
  const [places, setPlaces] = useState([]);
  const [zoomedOut, setZoomedOut] = useState(false);
  const [zoom, setZoom] = useState(map.getZoom());

  async function refresh() {
    const b = map.getBounds();
    onStatus("…");
    const list = await fetchPlaces(b.getSouth(), b.getWest(), b.getNorth(), b.getEast(), (part) => { setPlaces(part); onStatus(String(part.length)); });
    if (list === null) { setZoomedOut(true); setPlaces([]); onStatus("zoom in"); }
    else if (list === "error") { setZoomedOut(false); setPlaces([]); onStatus("can't load"); }
    else { setZoomedOut(false); setPlaces(list); onStatus(String(list.length)); }
  }

  useEffect(() => {
    const t = setTimeout(refresh, 400);
    return () => clearTimeout(t);
  }, []);

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => {
      clearTimeout(window.__placesTimer);
      window.__placesTimer = setTimeout(refresh, 700);
    },
  });

  return (
    <>
      {places.map((p) => (
        <Marker key={p.id} position={[p.lat, p.lng]} icon={p.kind === "train" ? trainIconFor(p.name, zoom) : landmarkIcon}>
          <Popup>
            <strong>{p.name}</strong><br />{p.kind === "train" ? "Train Station" : "Landmark"}
          </Popup>
        </Marker>
      ))}
      {zoomedOut && (
        <div style={{ position: "absolute", top: 70, left: 16, background: "rgba(255,255,255,0.92)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#000000", zIndex: 1000 }}>
          Zoom in to see train stations
        </div>
      )}
    </>
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
  const [newHost, setNewHost] = useState(0);
  const [newDriver, setNewDriver] = useState(0);
  const [newReviews, setNewReviews] = useState(0);
  const [newRequests, setNewRequests] = useState(0);
  const [toPay, setToPay] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    async function check() {
      const s = await unreadSummary(user.id);
      const rv = await loadHostReviews(user.id);
      const rc = await requestCounts(user.id);
      if (alive) { setNewHost(s.host); setNewDriver(s.driver); setNewReviews(rv.newCount); setNewRequests(rc.requests); setToPay(rc.toPay); }
    }
    check();
    const t = setInterval(check, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [user, viewingDashboard, viewingReservations]);
  const [viewingAdmin, setViewingAdmin] = useState(false);
  const [viewingPrivacy, setViewingPrivacy] = useState(false);
  const [viewingTerms, setViewingTerms] = useState(false);
  const [spaces, setSpaces] = useState([]);
  const [loadError, setLoadError] = useState(false);
  const [ratings, setRatings] = useState({});
  const [loading, setLoading] = useState(true);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [searchText, setSearchText] = useState("");
  const [mapView, setMapView] = useState("street");
  const [showPlaces, setShowPlaces] = useState(true);
  const [placesStatus, setPlacesStatus] = useState("");
  const [userPos, setUserPos] = useState(null);

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
    if (error) { console.error("Error loading spaces:", error); setLoadError(true); }
    else {
      setLoadError(false);
      const { data: { user: meUser } } = await supabase.auth.getUser();
      const me = meUser ? meUser.id : null;
      const { data: blockRows } = await supabase.from("blocks").select("blocked_id");
      const blocked = new Set((blockRows || []).map((b) => b.blocked_id));
      setSpaces((data || []).filter((sp) => !sp.paused && !blocked.has(sp.owner_id) && sp.owner_id !== me));
    }

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

  async function handleDeleteAccount() {
    const sure = window.confirm(
      "Delete your account?\n\nThis permanently deletes your account, your listed spaces, reservations, reviews and messages. This can't be undone."
    );
    if (!sure) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        "https://ppywqlxnjiiufxjhxjah.supabase.co/functions/v1/delete-account",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        alert("Couldn't delete account: " + (data.error || "Please try again."));
        return;
      }
      alert("Your account and data have been deleted.");
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      alert("Error: " + err.message);
    }
  }

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
  if (viewingAdmin) return <AdminDashboard onBack={() => setViewingAdmin(false)} />;
  if (viewingPrivacy) return <PrivacyPolicy onBack={() => setViewingPrivacy(false)} />;
  if (viewingTerms) return <TermsOfService onBack={() => setViewingTerms(false)} />;

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

  function goToMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(p);
        setMapCenter(p);
      },
      () => alert("Could not get your location. Check that location access is allowed for this site.")
    );
  }

  const visibleSpaces = spaces;
  const spacesWithLocation = visibleSpaces.filter((s) => s.latitude && s.longitude);
  const isAdmin = user.id === ADMIN_USER_ID;

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 13 }}>
      <div style={{ width: "100%", maxWidth: 380, boxSizing: "border-box", background: "#0d2c64", borderRadius: 24, overflow: "hidden", border: "1px solid #3B4F73", height: "fit-content" }}>

        <div style={{ height: 310, position: "relative", borderRadius: 20, overflow: "hidden", margin: 12 }}>
          <style>{".leaflet-bottom.leaflet-right{bottom:52px}"}</style>
          <MapContainer center={mapCenter} zoom={13} zoomControl={false} style={{ height: "100%", width: "100%" }}>
            {mapView === "street" ? (
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            ) : (
              <>
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                />
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                />
              </>
            )}
            <ZoomControl position="bottomright" />
            <RecenterMap center={mapCenter} />
            {showPlaces && <PlacesLayer onStatus={setPlacesStatus} />}
            {userPos && <Marker position={userPos} icon={blueDot} />}
            {spacesWithLocation.map((s) => (
              <Marker key={s.id} position={[s.latitude, s.longitude]} icon={redPin}>
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
            <AddressInput
              value={searchText}
              onChange={setSearchText}
              onPick={(r) => { setSearchText(r.label); setMapCenter([r.lat, r.lng]); }}
              bias={{ lat: mapCenter[0], lng: mapCenter[1] }}
              limit={6}
              placeholder="Search address, train station, food..."
              containerStyle={{ flex: 1 }}
              inputStyle={{ border: "none", outline: "none", fontSize: 13, color: "#1E2233", width: "100%", background: "transparent" }}
            />
          </form>

          <button
            aria-label="Switch map view" onClick={() => setMapView(mapView === "street" ? "satellite" : "street")}
            style={{ position: "absolute", bottom: 10, right: 10, background: "#FFFFFF", border: "none", borderRadius: 8, padding: 0, width: 40, height: 40, fontSize: 18, fontWeight: 700, color: "#1E2233", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 1000 }}
          >
            {mapView === "street" ? "🛰" : "🗺"}
          </button>

          <button
            onClick={() => setShowPlaces(!showPlaces)}
            aria-label="Show train stations"
            title="Show train stations"
            style={{ position: "absolute", bottom: 10, left: 10, background: showPlaces ? "#FFD60A" : "#FFFFFF", border: "none", borderRadius: 8, padding: "0 10px", height: 40, fontSize: 11, fontWeight: 700, color: "#1E2233", cursor: "pointer" }}
          >
            🚆 Trains {showPlaces ? `On · ${placesStatus}` : "Off"}
          </button>

          <button
            onClick={goToMyLocation}
            title="My location" aria-label="Go to my location"
            style={{ position: "absolute", top: 62, left: 10, background: "#FFFFFF", border: "none", borderRadius: 8, padding: 0, width: 40, height: 40, fontSize: 16, fontWeight: 700, color: "#1E2233", cursor: "pointer", boxShadow: "0 2px 6px rgba(0,0,0,0.2)", zIndex: 1000 }}
          >
            📍
          </button>

          {!loading && spacesWithLocation.length === 0 && (
            <div style={{ position: "absolute", bottom: 10, left: 130, right: 64, background: "#FFFFFF", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "#000000", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", zIndex: 1000 }}>
              No spaces near you yet — be the first to list one!
            </div>
          )}
        </div>

        <div style={{ padding: 16, color: "#FFFFFF" }}>
          <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 32, fontWeight: 700, fontStyle: "italic", fontFamily: "'Playfair Display', serif" }}>Park Aura</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "10px 0 14px" }}>
            <span style={{ fontSize: 16, color: "#B7C4DC" }}>Driving: <strong style={{ color: "#FFFFFF" }}>{vehicle.label}</strong></span>
            <button onClick={() => setEditingVehicle(true)} style={{ background: "#1E8E3E", border: "none", color: "#FFFFFF", fontWeight: 700, fontSize: 12, padding: "5px 10px", minHeight: 44, borderRadius: 6, cursor: "pointer" }}>
              Edit
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setViewingAdmin(true)}
              style={{ width: "100%", background: "#D92D20", color: "#FFFFFF", fontWeight: 800, border: "none", padding: 11, borderRadius: 10, marginBottom: 8, fontSize: 14, cursor: "pointer" }}
            >
              ⚙ Admin Dashboard
            </button>
          )}

          <button
            onClick={() => setViewingDashboard(true)}
            style={{ width: "100%", background: "#FFD60A", color: "#1E2233", fontWeight: 800, border: "none", padding: 11, borderRadius: 10, marginBottom: 8, fontSize: 14, cursor: "pointer" }}
          >
            My Host Dashboard
            {newHost > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#1E2233", marginTop: 3 }}>{newHost} New {newHost === 1 ? "Message" : "Messages"}</div>}
            {newReviews > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#1E2233", marginTop: 3 }}>{newReviews} New {newReviews === 1 ? "Review" : "Reviews"}</div>}
            {newRequests > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#1E2233", marginTop: 3 }}>{newRequests} New {newRequests === 1 ? "Request" : "Requests"} To Answer</div>}
          </button>
          <button
            onClick={() => setAddingSpace(true)}
            style={{ width: "100%", background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 11, borderRadius: 10, marginBottom: 8, fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            + List a Space
          </button>
          <button
            onClick={() => setViewingReservations(true)}
            style={{ width: "100%", background: "#334155", color: "#FFFFFF", fontWeight: 800, border: "none", padding: 11, borderRadius: 10, marginBottom: 20, fontSize: 14, cursor: "pointer" }}
          >
            My Reservations
            {newDriver > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD60A", marginTop: 3 }}>{newDriver} New {newDriver === 1 ? "Message" : "Messages"}</div>}
            {toPay > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: "#FFD60A", marginTop: 3 }}>{toPay} Approved — Ready To Pay</div>}
          </button>
          <div style={{ height: 14 }} />
          {loading && <div style={{ color: "#B7C4DC", fontSize: 13 }}>Loading spaces...</div>}



          {!loading && visibleSpaces.length === 0 && (
            <div style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 14, textAlign: "center", padding: "20px 0" }}>
              {loadError ? "Couldn't Load Spaces. Check Your Internet And Try Again." : "No Spaces Here Yet."}
              {loadError && <div><button onClick={loadSpaces} style={{ marginTop: 10, padding: "10px 18px", borderRadius: 10, border: "none", fontWeight: 800, cursor: "pointer" }}>Try Again</button></div>}
            </div>
          )}

          {!loading && visibleSpaces.map((s) => {
            const status = fitStatus(s, vehicle);
            const c = FIT_COPY[status];
            const ratingInfo = ratings[s.id];
            return (
              <div
                key={s.id}
                onClick={() => setSelectedSpace(s)}
                style={{ background: "#FFFFFF", border: "none", borderRadius: 14, marginBottom: 10, cursor: "pointer", overflow: "hidden" }}
              >
                <div style={{ position: "relative", height: 160, margin: "12px 12px 0", borderRadius: 8, overflow: "hidden", background: "#C9D6EE", display: "flex", alignItems: "center", justifyContent: "center", color: "#1E2233", fontSize: 12, fontWeight: 700 }}>
                  {(s.photo_urls && s.photo_urls.length > 0 ? s.photo_urls[0] : s.photo_url) ? <img src={s.photo_urls && s.photo_urls.length > 0 ? s.photo_urls[0] : s.photo_url} alt={"Photo of " + s.name} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} /> : "Photo coming soon"}
                  {s.distance != null && <div style={{ position: "absolute", top: 8, left: 8, background: "#FFFFFF", color: "#1E2233", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 20 }}>{s.distance} mi away</div>}
                </div>
                <div style={{ padding: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#1E2233", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.name}</div>
                  <div style={{ fontSize: 14, color: "#000000", margin: "4px 0 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Available {s.hours}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 }}>
                    <div style={{ background: "#DCE6FF", borderRadius: 8, padding: "0 4px", height: 58, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}><div style={{ fontSize: 15, fontWeight: 700, color: "#1E2233", whiteSpace: "nowrap" }}>${s.price}</div><div style={{ fontSize: 12, color: "#000000" }}>per hour</div></div>
                    <div style={{ background: "#DCE6FF", borderRadius: 8, padding: "0 4px", height: 58, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}><div style={{ fontSize: 15, fontWeight: 700, color: "#1E2233", whiteSpace: "nowrap" }}>{ratingInfo ? `⭐ ${ratingInfo.avg}` : "⭐ New"}</div><div style={{ fontSize: 12, color: "#000000" }}>{ratingInfo ? `${ratingInfo.count} review${ratingInfo.count === 1 ? "" : "s"}` : "no reviews"}</div></div>
                    <div style={{ background: "#DCE6FF", borderRadius: 8, padding: "0 4px", height: 58, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}><div style={{ fontSize: 15, fontWeight: 700, color: "#1E2233", whiteSpace: "nowrap" }}>{s.width}×{s.length}</div><div style={{ fontSize: 12, color: "#000000" }}>feet</div></div>
                  </div>
                  <span style={{ display: "inline-block", marginTop: 10, maxWidth: "100%", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", verticalAlign: "top", background: c.bg, color: c.text, fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                    {c.label} {vehicle.label.toLowerCase()}
                  </span>
                </div>
              </div>
            );
          })}

          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <button
              onClick={handleDeleteAccount}
              style={{ background: "none", border: "none", color: "#FF8A8A", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}
            >
              Delete my account
            </button>
          </div>

          <div style={{ textAlign: "center", paddingTop: 10, fontSize: 11, color: "#9AA8C4" }}>
            <a href="#" onClick={(e) => { e.preventDefault(); setViewingPrivacy(true); }} style={{ color: "#8FB4FF" }}>Privacy Policy</a>
            {" · "}
            <a href="#" onClick={(e) => { e.preventDefault(); setViewingTerms(true); }} style={{ color: "#8FB4FF" }}>Terms</a>
            {" · "}
            <a href="mailto:parkauraapp@gmail.com?subject=Park%20Aura%20Support" style={{ color: "#8FB4FF" }}>Contact Support</a>
          </div>

          <div style={{ textAlign: "center", paddingTop: 14 }}>
            <button
              onClick={() => supabase.auth.signOut().then(() => setUser(null))}
              style={{ background: "#FFFFFF", border: "none", color: "#000000", fontSize: 15, fontWeight: 700, minHeight: 44, minWidth: 160, borderRadius: 22, cursor: "pointer" }}
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}