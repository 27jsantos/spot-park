const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE = "https://spot-park-eight.vercel.app";

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
    return { id: payload.sub as string, email: (payload.email || "") as string };
  } catch {
    return null;
  }
}

async function stripe(path: string, method = "GET", params?: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Stripe request failed");
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const user = getUser(req);
    if (!user) throw new Error("Please log in again");

    const { action } = await req.json();
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const dbHeaders = {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    };

    // Does this host already have a payout account?
    const found = await fetch(
      `${supabaseUrl}/rest/v1/host_accounts?user_id=eq.${user.id}&select=stripe_account_id`,
      { headers: dbHeaders }
    );
    const rows = await found.json();
    if (!found.ok || !Array.isArray(rows)) throw new Error("Could not check payout account");
    let accountId: string | null = rows.length > 0 ? rows[0].stripe_account_id : null;

    if (action === "status") {
      if (!accountId) return json({ connected: false, ready: false });
      const acct = await stripe(`accounts/${accountId}`);
      return json({ connected: true, ready: !!(acct.charges_enabled && acct.payouts_enabled) });
    }

    if (action === "link") {
      if (!accountId) {
        const params = new URLSearchParams({
          type: "express",
          "capabilities[card_payments][requested]": "true",
          "capabilities[transfers][requested]": "true",
          "metadata[user_id]": user.id,
        });
        if (user.email) params.set("email", user.email);
        const acct = await stripe("accounts", "POST", params);
        accountId = acct.id as string;

        const saved = await fetch(`${supabaseUrl}/rest/v1/host_accounts`, {
          method: "POST",
          headers: { ...dbHeaders, Prefer: "return=minimal" },
          body: JSON.stringify({ user_id: user.id, stripe_account_id: accountId }),
        });
        if (!saved.ok) throw new Error("Could not save payout account");
      }

      const link = await stripe(
        "account_links",
        "POST",
        new URLSearchParams({
          account: accountId,
          refresh_url: SITE,
          return_url: SITE,
          type: "account_onboarding",
        })
      );
      return json({ url: link.url });
    }

    throw new Error("Unknown action");
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
});
