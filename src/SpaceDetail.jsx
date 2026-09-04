import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "./supabaseClient";
import { stripePromise } from "./stripeClient";

const FIT_COPY = {
  good: { label: "Good fit for your", ring: "#639922", bg: "#EAF3DE", text: "#3B6D11" },
  tight: { label: "Tight fit for your", ring: "#EF9F27", bg: "#FAEEDA", text: "#854F0B" },
  bad: { label: "Not recommended for your", ring: "#E24B4A", bg: "#FCEBEB", text: "#791F1F" },
};

function fitStatus(space, vehicle) {
  const wClear = space.width - vehicle.width;
  const lClear = space.length - vehicle.length;
  if (wClear < 0.5 || lClear < 1) return "bad";
  if (wClear < 1.5 || lClear < 2.5) return "tight";
  return "good";
}

function FitVisual({ space, vehicle, status }) {
  const c = FIT_COPY[status];
  const wScale = 160 / space.width;
  const vw = vehicle.width * wScale;
  const vl = (vehicle.length / space.length) * 220;
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "16px 0" }}>
      <svg width="180" height="240" viewBox="0 0 180 240">
        <rect x="10" y="10" width="160" height="220" rx="4" fill="none" stroke="#3B4F73" strokeWidth="2" strokeDasharray="6 5" />
        <rect x={90 - vw / 2} y={125 - vl / 2} width={vw} height={vl} rx={vw / 3} fill={c.ring} opacity="0.9" />
        <rect x={90 - vw / 2 + 6} y={125 - vl / 2 + 10} width={vw - 12} height={vl * 0.28} rx="4" fill="#FFFFFF" opacity="0.5" />
      </svg>
    </div>
  );
}

function PhotoGallery({ space }) {
  const photos = space.photo_urls && space.photo_urls.length > 0 ? space.photo_urls : (space.photo_url ? [space.photo_url] : []);
  const [index, setIndex] = useState(0);

  if (photos.length === 0) {
    return (
      <div style={{ height: 190, background: "#3B4F73", display: "flex", alignItems: "center", justifyContent: "center", color: "#B7C4DC", fontSize: 13 }}>
        Photo coming soon
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <img src={photos[index]} alt={space.name} style={{ width: "100%", height: 190, objectFit: "cover" }} />
      {photos.length > 1 && (
        <>
          <button onClick={() => setIndex((index - 1 + photos.length) % photos.length)} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "#FFFFFF", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}>‹</button>
          <button onClick={() => setIndex((index + 1) % photos.length)} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", color: "#FFFFFF", border: "none", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}>›</button>
          <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
            {photos.map((_, i) => (
              <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i === index ? "#FFFFFF" : "rgba(255,255,255,0.5)" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CheckoutForm({ space, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handlePay(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError("");

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message);
      setSaving(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from("reservations").insert({
      user_id: user.id,
      space_id: space.id,
      space_name: space.name,
      price: space.price,
      booking_type: "hourly",
      status: "confirmed",
    });

    setSaving(false);
    if (dbError) {
      setError("Payment succeeded but saving your reservation failed. Contact support.");
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handlePay} style={{ marginTop: 12 }}>
      <PaymentElement />
      {error && <div style={{ color: "#a33030", fontSize: 12, marginTop: 8 }}>{error}</div>}
      <button
        type="submit"
        disabled={!stripe || saving}
        style={{ width: "100%", background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, cursor: "pointer", marginTop: 12 }}
      >
        {saving ? "Processing..." : `Pay $${space.price}`}
      </button>
    </form>
  );
}

function LongTermRequest({ space, onSubmitted }) {
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const days = startDate && endDate ? Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1) : 0;
  const total = days * (space.daily_price || 0);

  async function handleRequest() {
    if (!startDate || !endDate) {
      setError("Please select both a start and end date.");
      return;
    }
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    const { error: dbError } = await supabase.from("reservations").insert({
      user_id: user.id,
      space_id: space.id,
      space_name: space.name,
      price: total,
      start_date: startDate.toISOString().split("T")[0],
      end_date: endDate.toISOString().split("T")[0],
      booking_type: "long_term",
      status: "pending",
      owner_id: space.owner_id,
    });

    setSaving(false);
    if (dbError) {
      setError("Something went wrong sending your request.");
      console.error(dbError);
    } else {
      onSubmitted();
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "#5A6178" }}>Start date</label>
          <DatePicker
            selected={startDate}
            onChange={setStartDate}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            minDate={new Date()}
            placeholderText="Select"
            className="date-input"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: "#5A6178" }}>End date</label>
          <DatePicker
            selected={endDate}
            onChange={setEndDate}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate || new Date()}
            placeholderText="Select"
            className="date-input"
          />
        </div>
      </div>

      {days > 0 && (
        <div style={{ fontSize: 13, color: "#1E2233", marginBottom: 10 }}>
          {days} day{days === 1 ? "" : "s"} × ${space.daily_price}/day = <strong>${total.toFixed(2)}</strong>
        </div>
      )}

      {error && <div style={{ color: "#a33030", fontSize: 12, marginBottom: 8 }}>{error}</div>}

      <button
        onClick={handleRequest}
        disabled={saving}
        style={{ width: "100%", background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 12, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
      >
        {saving ? "Sending..." : "Send Request to Host"}
      </button>
    </div>
  );
}

export default function SpaceDetail({ space, vehicle, onBack, ratingInfo }) {
  const [reserved, setReserved] = useState(false);
  const [requested, setRequested] = useState(false);
  const [paying, setPaying] = useState(false);
  const [mode, setMode] = useState("hourly");
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const status = fitStatus(space, vehicle);
  const c = FIT_COPY[status];

  async function startPayment() {
    setLoadingPayment(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        "https://ppywqlxnjiiufxjhxjah.supabase.co/functions/v1/create-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amount: space.price }),
        }
      );
      const data = await res.json();
      setLoadingPayment(false);

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPaying(true);
      } else {
        alert("Error from server: " + JSON.stringify(data));
      }
    } catch (err) {
      setLoadingPayment(false);
      alert("Network/JS error: " + err.message);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, overflow: "hidden", border: "1px solid #3B4F73", height: "fit-content" }}>

        <PhotoGallery space={space} />

        <div style={{ padding: 16, color: "#FFFFFF" }}>
          <button onClick={onBack} style={{ marginBottom: 12, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
            ← Back
          </button>

          <h1 style={{ fontSize: 19, margin: "0 0 4px", fontWeight: 800, color: "#FFFFFF" }}>{space.name}</h1>
          <div style={{ fontSize: 13, color: "#B7C4DC", marginBottom: 12 }}>
            {space.distance} mi away · ⭐ {ratingInfo ? `${ratingInfo.avg} (${ratingInfo.count} review${ratingInfo.count === 1 ? "" : "s"})` : "No ratings yet"}
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "6px 14px 16px" }}>
            <div style={{ display: "inline-flex", alignItems: "center", background: c.bg, color: c.text, fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 20, marginTop: 12 }}>
              {c.label} {vehicle.label.toLowerCase()}
            </div>
            <FitVisual space={space} vehicle={vehicle} status={status} />
            <div style={{ display: "flex", justifyContent: "space-around", fontSize: 12, color: "#5A6178" }}>
              <div>{space.width}' wide</div>
              <div>{space.length}' deep</div>
            </div>
          </div>

          <div style={{ margin: "14px 0", fontSize: 13, color: "#B7C4DC" }}>
            Available: {space.hours}
          </div>

          {!reserved && !requested && (
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setMode("hourly")}
                style={{ flex: 1, background: mode === "hourly" ? "#3B6FE0" : "#FFFFFF", color: mode === "hourly" ? "#FFFFFF" : "#1E2233", border: "1px solid #3B4F73", padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Hourly
              </button>
              {space.daily_price && (
                <button
                  onClick={() => setMode("long_term")}
                  style={{ flex: 1, background: mode === "long_term" ? "#3B6FE0" : "#FFFFFF", color: mode === "long_term" ? "#FFFFFF" : "#1E2233", border: "1px solid #3B4F73", padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Long-term
                </button>
              )}
            </div>
          )}

          <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 14 }}>
            {mode === "hourly" && !paying && !reserved && !requested && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: "#1E2233" }}>${space.price}/hr</strong>
                <button
                  onClick={startPayment}
                  disabled={loadingPayment}
                  style={{ background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
                >
                  {loadingPayment ? "Loading..." : "Reserve"}
                </button>
              </div>
            )}

            {mode === "hourly" && paying && clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm space={space} onSuccess={() => { setPaying(false); setReserved(true); }} />
              </Elements>
            )}

            {mode === "long_term" && !requested && !reserved && (
              <>
                <div style={{ color: "#1E2233", fontWeight: 700, marginBottom: 4 }}>${space.daily_price}/day</div>
                <LongTermRequest space={space} onSubmitted={() => setRequested(true)} />
              </>
            )}

            {requested && (
              <div style={{ textAlign: "center", color: "#854F0B", fontWeight: 700 }}>
                Request sent — waiting on the host to approve
              </div>
            )}

            {reserved && (
              <div style={{ textAlign: "center", color: "#3B6D11", fontWeight: 700 }}>
                Payment successful — reserved ✓
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}