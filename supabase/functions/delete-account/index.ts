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
function getUserId(req: Request): string | null {
  const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
  const part = token.split(".")[1];
  if (!part) return null;
  let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
  b64 = b64.padEnd(Math.ceil(b64.length / 4) * 4, "=");
  try {
    const payload = JSON.parse(atob(b64));
    return payload.sub || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userId = getUserId(req);
    if (!userId) throw new Error("Please log in again");

    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const headers = { apikey: key, Authorization: `Bearer ${key}` };

    async function get(path: string) {
      const r = await fetch(`${url}/rest/v1/${path}`, { headers });
      if (!r.ok) throw new Error(`Lookup failed: ${await r.text()}`);
      return await r.json();
    }

    async function del(path: string) {
      const r = await fetch(`${url}/rest/v1/${path}`, { method: "DELETE", headers });
      if (!r.ok) throw new Error(`Delete failed: ${await r.text()}`);
    }

    // 1. Block deletion if there is an upcoming paid booking
    const nowIso = encodeURIComponent(new Date().toISOString());
    const upcoming = await get(
      `reservations?or=(user_id.eq.${userId},owner_id.eq.${userId})&status=in.(confirmed,paid)&start_time=gt.${nowIso}&select=id&limit=1`
    );
    if (upcoming.length > 0) {
      throw new Error(
        "You have an upcoming paid reservation. Please wait until it has passed before deleting your account."
      );
    }

    // 2. Collect the user's spaces and every reservation that will be removed
    const spaces = await get(`spaces?owner_id=eq.${userId}&select=id`);
    const spaceIds = spaces.map((s: { id: string | number }) => s.id);
    const spaceList = spaceIds.join(",");

    let reservationFilter = `or=(user_id.eq.${userId},owner_id.eq.${userId}`;
    if (spaceIds.length > 0) reservationFilter += `,space_id.in.(${spaceList})`;
    reservationFilter += ")";

    const reservations = await get(`reservations?${reservationFilter}&select=id`);
    const reservationIds = reservations.map((r: { id: string | number }) => r.id);

    // 3. Delete in a safe order
    await del(`messages?or=(sender_id.eq.${userId},recipient_id.eq.${userId})`);
    if (reservationIds.length > 0) {
      await del(`messages?reservation_id=in.(${reservationIds.join(",")})`);
    }

    await del(`reviews?user_id=eq.${userId}`);
    if (spaceIds.length > 0) {
      await del(`reviews?space_id=in.(${spaceList})`);
    }

    if (reservationIds.length > 0) {
      await del(`reservations?id=in.(${reservationIds.join(",")})`);
    }

    if (spaceIds.length > 0) {
      await del(`spaces?owner_id=eq.${userId}`);
    }

    // 4. Delete the login itself
    const authRes = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
      method: "DELETE",
      headers,
    });
    if (!authRes.ok) {
      throw new Error(`Could not delete login: ${await authRes.text()}`);
    }

    return json({ ok: true });
  } catch (error) {
    return json({ error: (error as Error).message }, 400);
  }
});