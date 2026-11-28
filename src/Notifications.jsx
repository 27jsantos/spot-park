import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { getSeen } from "./unread";

const TABS = [["all", "All"], ["messages", "Messages"], ["payments", "Payments"]];

function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

export default function Notifications({ onBack, onOpenReservations, onOpenHost }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    let alive = true;
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const me = user.id;
      const skey = `park_aura_notif_seen_${me}`;
      let lastSeen = 0;
      try { lastSeen = Number(localStorage.getItem(skey)) || 0; } catch (e) {}

      const { data: res } = await supabase
        .from("reservations")
        .select("*")
        .or(`user_id.eq.${me},owner_id.eq.${me}`)
        .order("created_at", { ascending: false })
        .limit(40);
      const reservations = res || [];
      const byId = {};
      reservations.forEach((r) => { byId[r.id] = r; });

      const seen = getSeen(me);
      const { data: msgs } = await supabase
        .from("messages")
        .select("id, reservation_id, sender_id, created_at")
        .eq("recipient_id", me)
        .order("id", { ascending: false })
        .limit(30);

      const list = [];
      (msgs || []).forEach((m) => {
        const r = byId[m.reservation_id];
        list.push({ key: "m" + m.id, type: "messages", icon: "💬", title: "New Message", sub: r ? r.space_name : "Your booking", time: m.created_at, isNew: m.id > (seen[m.reservation_id] || 0), host: r ? r.owner_id === me : false });
      });
      reservations.forEach((r) => {
        const mine = r.user_id === me;
        const hosting = r.owner_id === me && !mine;
        const isNew = new Date(r.created_at).getTime() > lastSeen;
        const price = Number(r.price || 0).toFixed(2);
        if (mine && r.status === "confirmed" && r.booking_type === "long_term" && !r.payment_intent_id) {
          list.push({ key: "p" + r.id, type: "payments", icon: "💳", title: "Payment Needed", sub: `${r.space_name} · $${price}`, time: r.created_at, isNew: true, host: false });
        } else if (mine && r.status === "paid") {
          list.push({ key: "b" + r.id, type: "payments", icon: "✅", title: "Booking Confirmed", sub: `${r.space_name} · $${price}`, time: r.created_at, isNew, host: false });
        } else if (mine && r.status === "declined") {
          list.push({ key: "d" + r.id, type: "other", icon: "🚫", title: "Request Declined", sub: r.space_name, time: r.created_at, isNew, host: false });
        } else if (hosting && r.status === "pending") {
          list.push({ key: "q" + r.id, type: "other", icon: "📩", title: "New Long-Term Request", sub: r.space_name, time: r.created_at, isNew: true, host: true });
        } else if (hosting && r.status === "paid") {
          list.push({ key: "r" + r.id, type: "payments", icon: "💰", title: `Payment Received · $${price}`, sub: r.space_name, time: r.created_at, isNew, host: true });
        }
      });
      list.sort((a, b) => new Date(b.time) - new Date(a.time));
      if (alive) { setItems(list); setLoading(false); }
      try { localStorage.setItem(skey, String(Date.now())); } catch (e) {}
    }
    load();
    return () => { alive = false; };
  }, []);

  const shown = items.filter((n) => tab === "all" || n.type === tab);
  const hasNew = (t) => items.some((n) => n.isNew && (t === "all" || n.type === t));

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 13 }}>
      <div style={{ width: "100%", maxWidth: 380, boxSizing: "border-box", background: "#0d2c64", borderRadius: 24, padding: 20, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", minHeight: 44, color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ textAlign: "center", fontSize: 24, marginBottom: 16, color: "#FFFFFF", fontWeight: 800, fontFamily: "'Playfair Display', serif", textDecoration: "underline" }}>Notifications</h1>

        <div style={{ display: "flex", background: "#FFFFFF", borderRadius: 14, padding: 4, gap: 4, marginBottom: 12 }}>
          {TABS.map(([key, label]) => {
            const selected = tab === key;
            const yellow = key !== "all" && hasNew(key);
            return (
              <button
                key={key}
                aria-label={`${label}${yellow ? ", new" : ""}`}
                onClick={() => setTab(key)}
                style={{ flex: 1, minHeight: 44, borderRadius: 11, cursor: "pointer", fontSize: 13, border: selected ? "2px solid #1D6FD0" : "2px solid transparent", background: yellow ? "#FFD60A" : selected ? "#1D6FD0" : "transparent", color: selected && !yellow ? "#FFFFFF" : "#000000", fontWeight: selected || yellow ? 700 : 400 }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {loading && <div style={{ fontSize: 13, color: "#B7C4DC", textAlign: "center" }}>Loading...</div>}
        {!loading && shown.length === 0 && <div style={{ fontSize: 13, color: "#B7C4DC", textAlign: "center", marginTop: 8 }}>You're all caught up.</div>}

        {shown.map((n) => (
          <button
            key={n.key}
            onClick={() => (n.host ? onOpenHost() : onOpenReservations())}
            style={{ display: "block", width: "100%", border: "none", cursor: "pointer", borderRadius: 12, padding: 12, marginBottom: 8, textAlign: "center", background: n.isNew ? "#FFFFFF" : "#DCE6FF", color: "#000000" }}
          >
            <div style={{ fontSize: 14, fontWeight: n.isNew ? 800 : 700 }}>{n.icon} {n.title}</div>
            <div style={{ fontSize: 12, marginTop: 3 }}>{n.sub} · {timeAgo(n.time)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
