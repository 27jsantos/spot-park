import React, { useState, useEffect } from "react";
import { bookingLines } from "./bookingInfo";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { supabase } from "./supabaseClient";
import { stripePromise } from "./stripeClient";
import MessageThread from "./MessageThread";

function PayForm({ reservation, onPaid }) {
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

    // The server marks the reservation as paid once Stripe confirms the payment
    await new Promise((r) => setTimeout(r, 2500));
    setSaving(false);
    onPaid();
  }

  return (
    <form onSubmit={handlePay} style={{ marginTop: 10 }}>
      <PaymentElement />
      {error && <div style={{ color: "#a33030", fontSize: 12, marginTop: 8 }}>{error}</div>}
      <button
        type="submit"
        disabled={!stripe || saving}
        style={{ width: "100%", background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 10, borderRadius: 8, fontWeight: 700, cursor: "pointer", marginTop: 10, fontSize: 13 }}
      >
        {saving ? "Processing..." : `Pay $${reservation.price}`}
      </button>
    </form>
  );
}

export default function MyReservations({ onBack }) {
  const [reservations, setReservations] = useState([]);
  const [myReviews, setMyReviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [ratingId, setRatingId] = useState(null);
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState(null);
  const [spaceMap, setSpaceMap] = useState({});
  const [clientSecret, setClientSecret] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { data: resData, error: resError } = await supabase
      .from("reservations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (resError) console.error(resError);
    else {
      setReservations(resData);
      const ids = [...new Set((resData || []).map((x) => x.space_id).filter(Boolean))];
      if (ids.length) {
        const { data: sp } = await supabase.from("spaces").select("id, width, length").in("id", ids);
        const m = {};
        (sp || []).forEach((x) => { m[x.id] = x; });
        setSpaceMap(m);
      }
    }

    const { data: reviewData } = await supabase
      .from("reviews")
      .select("*")
      .eq("user_id", user.id);
    const map = {};
    (reviewData || []).forEach((r) => { map[r.space_id] = r; });
    setMyReviews(map);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(id) {
    const confirmed = window.confirm("Cancel this reservation?");
    if (!confirmed) return;
    const { error } = await supabase.from("reservations").delete().eq("id", id);
    if (error) {
      alert("Something went wrong cancelling this reservation.");
      console.error(error);
    } else {
      load();
    }
  }

  async function startPayment(reservation) {
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
          body: JSON.stringify({ reservation_id: reservation.id }),
        }
      );
      const data = await res.json();
      setLoadingPayment(false);

      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
        setPayingId(reservation.id);
      } else {
        alert("Error from server: " + JSON.stringify(data));
      }
    } catch (err) {
      setLoadingPayment(false);
      alert("Network/JS error: " + err.message);
    }
  }

  function startRating(res) {
    setRatingId(res.id);
    setStars(5);
    setComment("");
  }

  async function submitRating(res) {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("reviews").insert({
      space_id: res.space_id,
      user_id: user.id,
      rating: stars,
      comment,
    });
    setSaving(false);
    if (error) {
      alert("Something went wrong saving your review.");
      console.error(error);
    } else {
      setRatingId(null);
      load();
    }
  }

  const STATUS_LABEL = {
    pending: { text: "Waiting For Host Approval", color: "#6D4AE0" },
    confirmed: { text: "Approved — Not Paid Yet", color: "#D9730D" },
    declined: { text: "Declined By Host", color: "#D92D20" },
    paid: { text: "Paid", color: "#1E8E3E" },
  };

  return (
    <div style={{ minHeight: "100vh", background: "#385780", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", display: "flex", justifyContent: "center", padding: 20 }}>
      <div style={{ width: 380, background: "#0d2c64", borderRadius: 24, padding: 20, color: "#FFFFFF" }}>
        <button onClick={onBack} style={{ marginBottom: 16, background: "#3B4F73", border: "none", borderRadius: 6, padding: "5px 10px", color: "#FFFFFF", cursor: "pointer" }}>
          ← Back
        </button>
        <h1 style={{ fontSize: 20, marginBottom: 16, color: "#FFFFFF", fontWeight: 800 }}>My Reservations</h1>

        {loading && <div style={{ color: "#B7C4DC" }}>Loading...</div>}

        {!loading && reservations.length === 0 && (
          <div style={{ color: "#B7C4DC", fontSize: 14 }}>
            You haven't reserved a space yet.
          </div>
        )}

        {!loading && reservations.map((r) => {
          const myReview = r.space_id ? myReviews[r.space_id] : null;
          const statusInfo = r.status ? STATUS_LABEL[r.status] : null;

          return (
            <div key={r.id} style={{ background: "#FFFFFF", borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong style={{ color: "#1E2233" }}>{r.space_name}</strong>
                  {bookingLines(r, spaceMap[r.space_id]).map((l) => (
                    <div key={l.label} style={{ fontSize: 13, fontWeight: 800, color: "#1E2233", marginTop: 3 }}>{l.label}: {l.value}</div>
                  ))}
                  {statusInfo && (
                    <div style={{ display: "inline-block", fontSize: 11, color: "#FFFFFF", background: statusInfo.color, fontWeight: 800, marginTop: 6, padding: "4px 10px", borderRadius: 12 }}>
                      {statusInfo.text}
                    </div>
                  )}
                </div>
                {r.status !== "paid" && (
                  <button
                    onClick={() => handleCancel(r.id)}
                    style={{ background: "#fbe6e6", color: "#a33030", border: "none", padding: "6px 10px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                )}
              </div>

              {r.status === "confirmed" && payingId !== r.id && (
                <button
                  onClick={() => startPayment(r)}
                  disabled={loadingPayment}
                  style={{ width: "100%", marginTop: 10, background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 10, borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  {loadingPayment ? "Loading..." : `Pay $${r.price} Now`}
                </button>
              )}

              {payingId === r.id && clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret }}>
                  <PayForm reservation={r} onPaid={() => { setPayingId(null); load(); }} />
                </Elements>
              )}

              {r.owner_id && (
                <MessageThread reservationId={r.id} recipientId={r.owner_id} recipientEmail={r.owner_email} />
              )}

              {r.space_id && (r.status === "paid" || !r.status) && (
                myReview ? (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #EEE", fontSize: 12, color: "#5A6178" }}>
                    You rated this {"⭐".repeat(myReview.rating)}
                    {myReview.comment && <div style={{ marginTop: 2 }}>"{myReview.comment}"</div>}
                  </div>
                ) : ratingId === r.id ? (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #EEE" }}>
                    <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <span
                          key={n}
                          onClick={() => setStars(n)}
                          style={{ cursor: "pointer", fontSize: 20, color: n <= stars ? "#F5B301" : "#DDD" }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Optional comment..."
                      style={{ width: "100%", padding: 8, border: "1px solid #DDD", borderRadius: 6, fontSize: 12, resize: "none", minHeight: 50 }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        onClick={() => submitRating(r)}
                        disabled={saving}
                        style={{ flex: 1, background: "#3B6FE0", color: "#FFFFFF", border: "none", padding: 8, borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                      >
                        {saving ? "Saving..." : "Submit Rating"}
                      </button>
                      <button
                        onClick={() => setRatingId(null)}
                        style={{ flex: 1, background: "#E5E7EB", color: "#1E2233", border: "none", padding: 8, borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => startRating(r)}
                    style={{ marginTop: 10, background: "#E8ECFB", color: "#2A4FA0", border: "none", padding: "6px 12px", borderRadius: 6, fontSize: 12, cursor: "pointer" }}
                  >
                    Rate this space
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}