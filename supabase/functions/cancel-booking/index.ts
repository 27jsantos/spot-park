const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const part = token.split(".")[1];
  if (!part) return null;
  let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  b64 = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  try {
    const payload = JSON.parse(atob(b64));
    if (!payload.sub) return null;
    return { id: payload.sub as string };
  } catch {
    return null;
  }
}

// Driver cancels their own booking. Full refund if the booking starts more than 24 hours from now.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = getUser(req);
    if (!user) throw new Error("Please log in again");
    const { reservation_id } = await req.json();
    if (!reservation_id) throw new Error("Missing booking");

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const dbHeaders = { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };

    const r = await fetch(
      `${supabaseUrl}/rest/v1/reservations?id=eq.${encodeURIComponent(reservation_id)}&select=id,user_id,status,booking_type,start_time,start_date,payment_intent_id`,
      { headers: dbHeaders },
    );
    const rows = await r.json();
    const res = Array.isArray(rows) ? rows[0] : null;
    if (!res || res.user_id !== user.id) throw new Error("Booking not found");
    if (res.status === "cancelled") throw new Error("This booking is already cancelled");
    if (!["pending", "confirmed", "paid"].includes(res.status)) throw new Error("This booking can't be cancelled");

    if (res.status === "paid") {
      const startMs = res.booking_type === "long_term"
        ? new Date(res.start_date + "T00:00:00").getTime()
        : new Date(res.start_time).getTime();
      if (!startMs || startMs - Date.now() < 24 * 3600000) {
        throw new Error("Paid bookings can only be cancelled more than 24 hours before they start");
      }
      if (!res.payment_intent_id) throw new Error("No payment found for this booking");
      const refund = await fetch("https://api.stripe.com/v1/refunds", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          payment_intent: res.payment_intent_id,
          reverse_transfer: "true",
          refund_application_fee: "true",
        }),
      });
      const rd = await refund.json();
      if (!refund.ok) {
        // Older payments with no host transfer can't reverse one; retry as a plain refund
        const retry = await fetch("https://api.stripe.com/v1/refunds", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ payment_intent: res.payment_intent_id }),
        });
        const rd2 = await retry.json();
        if (!retry.ok) throw new Error(rd2.error?.message || rd.error?.message || "Refund failed");
      }
    }

    const up = await fetch(`${supabaseUrl}/rest/v1/reservations?id=eq.${encodeURIComponent(reservation_id)}`, {
      method: "PATCH",
      headers: dbHeaders,
      body: JSON.stringify({ status: "cancelled" }),
    });
    if (!up.ok) throw new Error("Refunded, but couldn't update the booking. Please contact support.");
    return json({ ok: true, refunded: res.status === "paid" });
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
});
