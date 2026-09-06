import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function MessageThread({ reservationId, recipientId, recipientEmail }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(null);
  const [open, setOpen] = useState(false);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user.id);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("created_at", { ascending: true });
    if (error) console.error(error);
    else setMessages(data || []);
  }

  useEffect(() => {
    if (open) load();
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
              subject: "New message on Spot Aura",
              message: `You have a new message about your booking: "${text.trim()}". Log in to Spot Aura to reply.`,
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
        {messages.map((m) => (
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