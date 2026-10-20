import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function MessageThread({ reservationId, recipientId, recipientEmail }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(null);
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState([]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user.id);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("id", { ascending: true });
    if (error) console.error(error);
    else setMessages(data || []);
    const { data: b } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
    setBlocked((b || []).map((x) => x.blocked_id));
  }

  async function reportMessage(m) {
    if (!window.confirm("Report this message to Park Aura? We review reports within 24 hours.")) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: myId, reported_user_id: m.sender_id, message_id: m.id, reason: "Objectionable content" });
    alert(error ? "Could not send the report. Please email parkauraapp@gmail.com." : "Thanks. We will review this within 24 hours.");
  }

  async function blockUser(userId) {
    if (!window.confirm("Block this user? You will no longer see their messages.")) return;
    const { error } = await supabase.from("blocked_users").insert({ blocker_id: myId, blocked_id: userId });
    if (error) alert("Could not block this user.");
    else setBlocked([...blocked, userId]);
  }

  useEffect(() => {
    if (!open) return;
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [open]);

  async function handleSend(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from("messages").insert({
      reservation_id: reservationId,
      sender_id: user.id,
      recipient_id: recipientId,
      body: text.trim(),
    });

    setSending(false);
    if (error) {
      alert("Something went wrong sending your message.");
      console.error(error);
    } else {
      if (recipientEmail) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          fetch("https://ppywqlxnjiiufxjhxjah.supabase.co/functions/v1/send-notification", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              email: recipientEmail,
              subject: "New message on Park Aura",
              message: `You have a new message about your booking: "${text.trim()}". Log in to Park Aura to reply.`,
            }),
          }).catch((err) => console.error("Notification failed:", err));
        });
      }
      setText("");
      load();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{ marginTop: 10, background: "#E8ECFB", color: "#2A4FA0", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
      >
        💬 Messages
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #EEE" }}>
      <div style={{ maxHeight: 160, overflowY: "auto", marginBottom: 8, display: "flex", flexDirection: "column", gap: 6 }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: "#5A6178" }}>No messages yet.</div>
        )}
        {messages.filter((m) => !blocked.includes(m.sender_id)).map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.sender_id === myId ? "flex-end" : "flex-start",
              background: m.sender_id === myId ? "#3B6FE0" : "#EEE",
              color: m.sender_id === myId ? "#FFFFFF" : "#1E2233",
              padding: "6px 10px",
              borderRadius: 10,
              fontSize: 12,
              maxWidth: "80%",
            }}
          >
            {m.body}
            {m.sender_id !== myId && (
              <div style={{ marginTop: 4, fontSize: 10 }}>
                <a href="#" onClick={(e) => { e.preventDefault(); reportMessage(m); }} style={{ color: "#B3261E", marginRight: 8 }}>Report</a>
                <a href="#" onClick={(e) => { e.preventDefault(); blockUser(m.sender_id); }} style={{ color: "#5A6178" }}>Block</a>
              </div>
            )}
          </div>
        ))}
      </div>
      <form onSubmit={handleSend} style={{ display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: 8, border: "1px solid #DDD", borderRadius: 6, fontSize: 12 }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{ background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}