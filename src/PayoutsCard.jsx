import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

export default function PayoutsCard() {
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  async function check() {
    const { data, error } = await supabase.functions.invoke("connect-onboard", { body: { action: "status" } });
    if (error || !data) setStatus("unknown");
    else setStatus(data.ready ? "ready" : data.connected ? "pending" : "none");
  }

  useEffect(() => {
    check();
  }, []);

  async function startSetup() {
    setError("");
    const { data, error } = await supabase.functions.invoke("connect-onboard", { body: { action: "link" } });
    if (error || !data?.url) {
      setError("Couldn't start payout setup. Please try again.");
      return;
    }
    window.location.href = data.url;
  }

  if (status === "loading") return null;

  return (
    <div style={{ background: "#FFFFFF", borderRadius: 12, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 13, color: "#5A6178" }}>Payouts</div>
      {status === "ready" ? (
        <div style={{ fontSize: 15, fontWeight: 700, color: "#2C5E3F", marginTop: 4 }}>✓ You're set up to get paid</div>
      ) : (
        <div>
          <div style={{ fontSize: 13, color: "#1E2233", margin: "6px 0 10px" }}>
            {status === "pending"
              ? "Finish your payout setup to receive your 80% of each booking."
              : "Connect your bank to get paid. You keep 80% of each booking."}
          </div>
          <button
            onClick={startSetup}
            style={{ background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: "10px 14px", borderRadius: 8, fontWeight: 700, cursor: "pointer", width: "100%" }}
          >
            {status === "pending" ? "Finish payout setup" : "Set up payouts"}
          </button>
          {error && <div style={{ color: "#a33030", fontSize: 12, marginTop: 6 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
