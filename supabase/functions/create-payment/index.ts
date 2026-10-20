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

// Read who is logged in from the (already verified) login token
function getUser(req: Request) {
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const part = token.split(".")[1];
  if (!part) return null;
  let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  b64 = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  try {
    const payload = JSON.parse(atob(b64));
    if (!payload.sub) return null;
    return { id: payload.sub as string, email: (payload.email || "") as string };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = getUser(req);
    if (!user) throw new Error("Please log in again");

    const body = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const dbHeaders = { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` };

    let space_id: string;
    let cents: number;
    const meta: Record<string, string> = {};
    let space: { price?: number; daily_price?: number; name?: string; owner_id?: string; owner_email?: string };

    if (body.reservation_id) {
      // Paying for an approved long-term request. Everything comes from the database.
      const resRes = await fetch(
        `${supabaseUrl}/rest/v1/reservations?id=eq.${encodeURIComponent(body.reservation_id)}&select=id,user_id,space_id,status,booking_type,start_date,end_date,payment_intent_id`,
        { headers: dbHeaders }
      );
      const resRows = await resRes.json();
      if (!resRes.ok || !Array.isArray(resRows) || resRows.length === 0) throw new Error("Reservation not found");
      const reservation = resRows[0];
      if (reservation.user_id !== user.id) throw new Error("This is not your reservation");
      if (reservation.booking_type !== "long_term" || reservation.status !== "confirmed" || reservation.payment_intent_id) {
        throw new Error("This reservation does not need payment");
      }
      space_id = String(reservation.space_id);
      const spaceRes = await fetch(
        `${supabaseUrl}/rest/v1/spaces?id=eq.${encodeURIComponent(space_id)}&select=price,daily_price,name,owner_id,owner_email`,
        { headers: dbHeaders }
      );
      const rows = await spaceRes.json();
      if (!spaceRes.ok || !Array.isArray(rows) || rows.length === 0) throw new Error("Space not found");
      space = rows[0];
      const dayMs = 1000 * 60 * 60 * 24;
      const days = Math.max(1, Math.ceil((new Date(reservation.end_date).getTime() - new Date(reservation.start_date).getTime()) / dayMs) + 1);
      cents = Math.round(Number(space.daily_price) * days * 100);
      if (!(cents >= 50)) throw new Error("Amount is too small");
      meta["metadata[reservation_id]"] = String(reservation.id);
    } else {
      const hoursIn = body.hours;
      const h = Number(hoursIn);
      space_id = body.space_id;
      if (!space_id || !Number.isInteger(h) || h < 1 || h > 24) {
        throw new Error("Invalid booking details");
      }
      const start = new Date(body.start_time);
      if (isNaN(start.getTime()) || start.getTime() < Date.now() - 60000) {
        throw new Error("Start time must be in the future");
      }
      // Look up the real price and host in the database (never trust the app)
      const spaceRes = await fetch(
        `${supabaseUrl}/rest/v1/spaces?id=eq.${encodeURIComponent(space_id)}&select=price,name,owner_id,owner_email`,
        { headers: dbHeaders }
      );
      const rows = await spaceRes.json();
      if (!spaceRes.ok || !Array.isArray(rows) || rows.length === 0) {
        throw new Error("Space not found");
      }
      space = rows[0];
      cents = Math.round(Number(space.price) * h * 100);
      if (!(cents >= 50)) {
        throw new Error("Amount is too small");
      }
      meta["metadata[hours]"] = String(h);
      meta["metadata[start_time]"] = start.toISOString();
    }

    const params = new URLSearchParams({
      amount: String(cents),
      currency: "usd",
      "metadata[space_id]": String(space_id),
      "metadata[space_name]": String(space.name ?? ""),
      "metadata[user_id]": user.id,
      "metadata[user_email]": user.email,
      ...meta,
    });
    // If the host has finished payout setup, send them 80% and keep 20%
    if (space.owner_id) {
      const hostRes = await fetch(
        `${supabaseUrl}/rest/v1/host_accounts?user_id=eq.${encodeURIComponent(space.owner_id)}&select=stripe_account_id`,
        { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` } }
      );
      const hostRows = await hostRes.json();
      if (hostRes.ok && Array.isArray(hostRows) && hostRows.length > 0) {
        const acctId = hostRows[0].stripe_account_id;
        const acctRes = await fetch(`https://api.stripe.com/v1/accounts/${acctId}`, {
          headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}` },
        });
        const acct = await acctRes.json();
        if (acctRes.ok && acct.charges_enabled && acct.payouts_enabled) {
          params.set("transfer_data[destination]", acctId);
          params.set("application_fee_amount", String(Math.round(cents * 0.2)));
        }
      }
    }
    if (space.owner_id) params.set("metadata[owner_id]", String(space.owner_id));
    if (space.owner_email) params.set("metadata[owner_email]", String(space.owner_email));

    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    const data = await stripeRes.json();
    if (!stripeRes.ok) {
      throw new Error(data.error?.message || "Stripe request failed");
    }

    return json({ clientSecret: data.client_secret, total: cents / 100 });
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
});