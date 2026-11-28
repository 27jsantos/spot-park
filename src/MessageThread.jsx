import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { countUnreadFor, markSeen } from "./unread";

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function MessageThread({ reservationId, recipientId, recipientEmail }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(null);
  const [open, setOpen] = useState(false);
  const [blocked, setBlocked] = useState([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    setMyId(user.id);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("reservation_id", reservationId)
      .order("id", { ascending: true });
    if (error) console.error(error);
    else {
      setMessages(data || []);
      const incoming = (data || []).filter((x) => x.recipient_id === user.id).map((x) => x.id);
      if (incoming.length) markSeen(user.id, reservationId, Math.max(...incoming));
      setUnread(0);
      const unreadIds = (data || []).filter((x) => x.recipient_id === user.id && "read_at" in x && !x.read_at).map((x) => x.id);
      if (unreadIds.length) {
        await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unreadIds).eq("recipient_id", user.id);
      }
    }
    const { data: b } = await supabase.from("blocked_users").select("blocked_id").eq("blocker_id", user.id);
    const { data: listingBlocks } = await supabase.from("blocks").select("blocked_id");
    setBlocked([...(b || []), ...(listingBlocks || [])].map((x) => x.blocked_id));
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
    if (open) return;
    let alive = true;
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const n = await countUnreadFor(user.id, reservationId);
      if (alive) setUnread(n);
    }
    check();
    const t = setInterval(check, 8000);
    return () => { alive = false; clearInterval(t); };
  }, [open]);

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
        style={{ display: "block", width: "100%", marginTop: 10, background: "#FFD60A", color: "#000000", border: "none", padding: "6px 12px", minHeight: 44, borderRadius: 8, fontSize: 14, fontWeight: 700, textAlign: "center", cursor: "pointer" }}
      >
        💬 Messages{unread > 0 && <span style={{ color: "#B42318", fontWeight: 800 }}>{`  ·  ${unread} New`}</span>}
      </button>
    );
  }

  return (
    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #EEE" }}>
      <div style={{ maxHeight: 280, overflowY: "auto", marginBottom: 8, display: "flex", flexDirection: "column" }}>
        {messages.length === 0 && (
          <div style={{ fontSize: 12, color: "#000000", textAlign: "center" }}>No messages yet.</div>
        )}
        {messages.filter((m) => !blocked.includes(m.sender_id)).map((m) => {
          const mine = m.sender_id === myId;
          return (
            <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", marginBottom: 6 }}>
              <div
                style={{
                  background: mine ? "#3B6FE0" : "#E3E6EE",
                  color: mine ? "#FFFFFF" : "#000000",
                  padding: "14px 18px",
                  borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  fontSize: 14,
                  maxWidth: "85%",
                  wordBreak: "break-word",
                }}
              >
                {m.body}
              </div>
              {!!m.created_at && (
                <div style={{ fontSize: 11, marginTop: 3, color: "#000000" }}>
                  {mine
                    ? `Sent ${formatTime(m.created_at)}${m.read_at ? `  ·  Read ${formatTime(m.read_at)}` : "  ·  Not read yet"}`
                    : `Received ${formatTime(m.created_at)}`}
                </div>
              )}
              {!mine && (
                <div style={{ marginTop: 2, fontSize: 11 }}>
                  <a href="#" onClick={(e) => { e.preventDefault(); reportMessage(m); }} style={{ color: "#B3261E", marginRight: 14 }}>Report</a>
                  <a href="#" onClick={(e) => { e.preventDefault(); blockUser(m.sender_id); }} style={{ color: "#000000" }}>Block</a>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <form onSubmit={handleSend} style={{ display: "flex", gap: 6 }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message..."
          style={{ flex: 1, padding: "10px 16px", minHeight: 44, boxSizing: "border-box", border: "1px solid #DDD", borderRadius: 22, fontSize: 14, color: "#000000" }}
        />
        <button
          type="submit"
          disabled={sending}
          style={{ background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: "8px 18px", minHeight: 44, borderRadius: 22, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}