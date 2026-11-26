import React, { useState, useEffect } from "react";
import { bookingLines } from "./bookingInfo";
import { supabase } from "./supabaseClient";
import MessageThread from "./MessageThread";
import { loadHostReviews, markReviewsSeen } from "./unread";
import PayoutsCard from "./PayoutsCard";

const inputStyle = { display: "block", width: "100%", padding: 8, marginTop: 4, border: "1px solid #3B4F73", borderRadius: 6, background: "#FFFFFF", color: "#1E2233", fontSize: 13 };

function notifyByEmail(email, subject, message) {
  supabase.auth.getSession().then(({ data: { session } }) => {
    fetch("https://ppywqlxnjiiufxjhxjah.supabase.co/functions/v1/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, subject, message }),
    }).catch((err) => console.error("Notification failed:", err));
  });
}

export default function HostDashboard({ onBack }) {
  const [mySpaces, setMySpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewSeen, setReviewSeen] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState(null);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase.from("spaces").select("*").eq("owner_id", user.id);
    if (error) console.error(error);
    else setMySpaces(data);

    const { data: reqData, error: reqError } = await supabase
      .from("reservations")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (reqError) console.error(reqError);
    else {
      setRequests((reqData || []).filter((r) => r.status === "pending"));
      setBookings((reqData || []).filter((r) => r.status !== "pending"));
    }

    const rv = await loadHostReviews(user.id);
    setReviews(rv.reviews);
    setReviewSeen((prev) => Math.max(prev, rv.seen));
    if (rv.reviews.length) markReviewsSeen(user.id, Math.max(...rv.reviews.map((r) => r.id)));

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id) {
    const confirmed = window.confirm("Remove this space from Park Aura?");
    if (!confirmed) return;
    const { error } = await supabase.from("spaces").delete().eq("id", id);
    if (error) {
      alert("Something went wrong deleting this space.");
      console.error(error);
    } else {
      load();
    }
  }

  async function handleDuplicate(space) {
    setDuplicatingId(space.id);
    const { id, created_at, ...rest } = space;
    const { error } = await supabase.from("spaces").insert({
      ...rest,
      name: `${space.name} (copy)`,
    });
    setDuplicatingId(null);
    if (error) {
      alert("Something went wrong duplicating this space.");
      console.error(error);
    } else {
      load();
    }
  }

  async function handleRequestDecision(request, decision) {
    const { error } = await supabase
      .from("reservations")
      .update({ status: decision })
      .eq("id", request.id);

    if (error) {
      alert("Something went wrong updating this request.");
      console.error(error);
      return;
    }

    load();

    if (request.user_email) {
      const subject = decision === "confirmed" ? "Your request was approved!" : "Your request was declined";
      const message = decision === "confirmed"
        ? `Good news — your request for "${request.space_name}" (${request.start_date} to ${request.end_date}) was approved. Log in to Park Aura to complete payment.`
        : `Your request for "${request.space_name}" (${request.start_date} to ${request.end_date}) was declined by the host.`;
      notifyByEmail(request.user_email, subject, message);
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
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 13 }}>
      <div style={{ width: "100%", maxWidth: 380, boxSizing: "border-box", background: "#0d2c64", borderRadius: 24, padding: 20, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", minHeight: 44, color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ textAlign: "center", textDecoration: "underline", fontSize: 28, marginBottom: 16, color: "#FFFFFF", fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>My Host Dashboard</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textDecoration: "underline", color: "#000000" }}>Earned</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233", marginTop: 2 }}>${(bookings.filter((b) => b.status === "paid").reduce((sum, b) => sum + Number(b.price || 0), 0) * 0.8).toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "#000000" }}>After 20% fee</div>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textDecoration: "underline", color: "#000000" }}>Waiting for payment</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233", marginTop: 2 }}>${(bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + Number(b.price || 0), 0) * 0.8).toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "#000000" }}>Approved bookings</div>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textDecoration: "underline", color: "#000000" }}>Your spaces</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233", marginTop: 2 }}>{mySpaces.length}</div>
          </div>
          <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, textDecoration: "underline", color: "#000000" }}>Needs answer</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#1E2233", marginTop: 2 }}>{requests.length}</div>
            <div style={{ fontSize: 11, color: "#000000" }}>New requests</div>
          </div>
        </div>

        <PayoutsCard />

        {requests.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, textAlign: "center", textDecoration: "underline", marginBottom: 12, color: "#FFFFFF", marginTop: 0 }}>Pending Requests ({requests.length})</h2>
            {requests.map((r) => (
              <div key={r.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: "#1E2233", textDecoration: "underline" }}>{r.space_name}</div>
                {(() => {
                  const ls = bookingLines(r, mySpaces.find((x) => x.id === r.space_id));
                  return (
                    <div style={{ textAlign: "center", margin: "6px 0 8px", color: "#000000" }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{ls[0].value}</div>
                      {ls.length > 1 && <div style={{ fontSize: 14, marginTop: 2 }}>{ls.slice(1).map((l) => l.value).join(" · ")}</div>}
                    </div>
                  );
                })()}
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <button
                    onClick={() => handleRequestDecision(r, "confirmed")}
                    style={{ flex: 1, background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 8, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRequestDecision(r, "declined")}
                    style={{ flex: 1, background: "#fbe6e6", color: "#a33030", border: "none", padding: 8, borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                  >
                    Decline
                  </button>
                </div>
                <MessageThread reservationId={r.id} recipientId={r.user_id} recipientEmail={r.user_email} />
              </div>
            ))}
          </div>
        )}

        {bookings.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, textAlign: "center", textDecoration: "underline", marginBottom: 12, color: "#FFFFFF" }}>Bookings And Messages</div>
            {bookings.map((r) => (
              <div key={r.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <div style={{ textAlign: "center", fontSize: 18, fontWeight: 700, color: "#1E2233", textDecoration: "underline" }}>{r.space_name}</div>
                {!!r.status && (
                  <div style={{ display: "block", width: "fit-content", margin: "6px auto 2px", color: "#FFFFFF", fontSize: 13, fontWeight: 700, padding: "4px 12px", borderRadius: 12, background: r.status === "paid" ? "#1E8E3E" : r.status === "confirmed" ? "#D9730D" : r.status === "declined" ? "#D92D20" : r.status === "cancelled" ? "#5B6475" : "#6D4AE0" }}>
                    {r.status === "paid" ? "Paid" : r.status === "confirmed" ? "Approved — Not Paid Yet" : r.status === "declined" ? "Declined" : r.status === "cancelled" ? "Cancelled By Driver" : "Waiting For Your Approval"}
                  </div>
                )}
                {(() => {
                  const ls = bookingLines(r, mySpaces.find((x) => x.id === r.space_id));
                  return (
                    <div style={{ textAlign: "center", margin: "6px 0 8px", color: "#000000" }}>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{ls[0].value}</div>
                      {ls.length > 1 && <div style={{ fontSize: 14, marginTop: 2 }}>{ls.slice(1).map((l) => l.value).join(" · ")}</div>}
                    </div>
                  );
                })()}
                {r.user_id !== r.owner_id && (
                  <MessageThread reservationId={r.id} recipientId={r.user_id} recipientEmail={r.user_email} />
                )}
              </div>
            ))}
          </div>
        )}

        {reviews.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, textAlign: "center", textDecoration: "underline", marginBottom: 12, color: "#FFFFFF" }}>
              Reviews{reviews.filter((r) => r.id > reviewSeen).length > 0 && <span style={{ color: "#FFD60A" }}>{`  ·  ${reviews.filter((r) => r.id > reviewSeen).length} New`}</span>}
            </div>
            {reviews.map((r) => (
              <div key={r.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 10 }}>
                <strong style={{ color: "#1E2233" }}>{r.space_name}</strong>
                <div style={{ fontSize: 12, color: "#000000", margin: "4px 0" }}>
                  {"⭐".repeat(r.rating)}{r.id > reviewSeen && <span style={{ color: "#D92D20", fontWeight: 800 }}>{"  ·  NEW"}</span>}
                </div>
                {r.comment && <div style={{ fontSize: 13, color: "#1E2233" }}>"{r.comment}"</div>}
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: 22, textAlign: "center", textDecoration: "underline", color: "#FFFFFF", margin: "0 0 12px" }}>Your Spaces</h2>
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
                <label style={{ fontSize: 12, fontWeight: 700, color: "#000000" }}>
                  Name
                  <input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#000000" }}>
                  Price per hour ($)
                  <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} style={inputStyle} />
                </label>
                <label style={{ fontSize: 12, fontWeight: 700, color: "#000000" }}>
                  Available hours
                  <input value={editForm.hours} onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })} style={inputStyle} />
                </label>
                <div style={{ display: "flex", gap: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#000000", flex: 1 }}>
                    Width (ft)
                    <input type="number" step="0.1" value={editForm.width} onChange={(e) => setEditForm({ ...editForm, width: e.target.value })} style={inputStyle} />
                  </label>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "#000000", flex: 1 }}>
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
              <div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ width: "100%", height: 160, borderRadius: 8, background: "#C9D6EE", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#1E2233" }}>
                    {(s.photo_urls && s.photo_urls[0]) || s.photo_url ? <img src={(s.photo_urls && s.photo_urls[0]) || s.photo_url} alt={"Photo of " + s.name} style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }} /> : "No photo"}
                  </div>
                  <div style={{ color: "#1E2233", fontSize: 18, fontWeight: 700, marginTop: 8 }}>{s.name}</div>
                  <div style={{ fontSize: 14, color: "#000000", marginBottom: 6 }}>${s.price}/hr · {s.hours} · {s.width}' × {s.length}'</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <span style={{ background: s.paused ? "#5B6475" : "#EAF3DE", color: s.paused ? "#FFFFFF" : "#27500A", fontSize: 13, fontWeight: 800, padding: "2px 10px", borderRadius: 12 }}>{s.paused ? "Paused" : "Live"}</span>
                    {(() => {
                      const rs = reviews.filter((r) => r.space_id === s.id);
                      return rs.length ? <span style={{ fontSize: 13, color: "#000000" }}>⭐ {(rs.reduce((a, r) => a + r.rating, 0) / rs.length).toFixed(1)} ({rs.length})</span> : null;
                    })()}
                  </div>
                </div>
                <button onClick={() => startEditing(s)} style={{ width: "100%", marginTop: 12, background: "#1D6FD0", border: "none", color: "#FFFFFF", minHeight: 40, borderRadius: 20, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>✏️ Edit Space</button>
                <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                  <button
                    onClick={async () => {
                      const { error } = await supabase.from("spaces").update({ paused: !s.paused }).eq("id", s.id);
                      if (error) alert("Couldn't update this space."); else load();
                    }}
                    style={{ flex: 1, padding: "0 4px", background: "#FFFFFF", border: "2px solid #0D2C64", boxSizing: "border-box", color: "#000000", minHeight: 40, borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >{s.paused ? "▶️ Resume" : "⏸ Pause"}</button>
                  <button onClick={() => handleDuplicate(s)} disabled={duplicatingId === s.id} style={{ flex: 1, padding: "0 4px", background: "#FFFFFF", border: "2px solid #0D2C64", boxSizing: "border-box", color: "#000000", minHeight: 40, borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{duplicatingId === s.id ? "..." : "📄 Copy"}</button>
                  <button onClick={() => handleDelete(s.id)} style={{ flex: 1, padding: "0 4px", background: "#FFFFFF", border: "2px solid #D92D20", boxSizing: "border-box", color: "#B3261E", minHeight: 40, borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>🗑 Remove</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}