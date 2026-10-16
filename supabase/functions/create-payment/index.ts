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

    const { space_id, hours, start_time } = await req.json();
    const h = Number(hours);

    if (!space_id || !Number.isInteger(h) || h < 1 || h > 24) {
      throw new Error("Invalid booking details");
    }

    const start = new Date(start_time);
    if (isNaN(start.getTime()) || start.getTime() < Date.now() - 60000) {
      throw new Error("Start time must be in the future");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Look up the real price and host in the database (never trust the app)
    const spaceRes = await fetch(
      `${supabaseUrl}/rest/v1/spaces?id=eq.${encodeURIComponent(space_id)}&select=price,name,owner_id,owner_email`,
      { headers: { apikey: serviceKey!, Authorization: `Bearer ${serviceKey}` } }
    );
    const rows = await spaceRes.json();
    if (!spaceRes.ok || !Array.isArray(rows) || rows.length === 0) {
      throw new Error("Space not found");
    }
    const space = rows[0];

    const price = Number(space.price);
    const cents = Math.round(price * h * 100);
    if (!(cents >= 50)) {
      throw new Error("Amount is too small");
    }

    const params = new URLSearchParams({
      amount: String(cents),
      currency: "usd",
      "metadata[space_id]": String(space_id),
      "metadata[space_name]": String(space.name ?? ""),
      "metadata[hours]": String(h),
      "metadata[start_time]": start.toISOString(),
      "metadata[user_id]": user.id,
      "metadata[user_email]": user.email,
    });
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