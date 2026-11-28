const enc = new TextEncoder();

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifySignature(payload: string, header: string, secret: string) {
  const parts = header.split(",");
  const t = parts.find((p) => p.startsWith("t="))?.slice(2);
  const sigs = parts.filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  if (!t || sigs.length === 0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(`${t}.${payload}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return sigs.some((s) => safeEqual(s, expected));
}

async function sendEmail(to: string | null | undefined, subject: string, text: string) {
  if (!to) return;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Park Aura <onboarding@resend.dev>", to, subject, text }),
    });
    if (!r.ok) console.error("Email failed:", await r.text());
  } catch (e) {
    console.error("Email error:", e);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const raw = await req.text();
  const header = req.headers.get("stripe-signature") || "";
  const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";

  const valid = secret && header && (await verifySignature(raw, header, secret));
  if (!valid) {
    return new Response("Invalid signature", { status: 400 });
  }

  const event = JSON.parse(raw);

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object;
    const m = pi.metadata || {};

    // A long-term request that the host approved and the driver has now paid
    if (m.reservation_id && m.user_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const upd = await fetch(
        `${supabaseUrl}/rest/v1/reservations?id=eq.${encodeURIComponent(m.reservation_id)}&user_id=eq.${encodeURIComponent(m.user_id)}`,
        {
          method: "PATCH",
          headers: {
            apikey: serviceKey!,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal",
          },
          body: JSON.stringify({ status: "paid", payment_intent_id: pi.id }),
        }
      );
      if (!upd.ok) {
        console.error("Reservation update failed:", await upd.text());
        return new Response("Update failed", { status: 500 });
      }
      const nm = m.space_name || "your space";
      const amt = `$${(pi.amount_received / 100).toFixed(2)}`;
      await sendEmail(m.owner_email, `Payment received for ${nm}`, `The driver paid ${amt} for the long-term stay at "${nm}". Open Host Dashboard in Park Aura to see the details.`);
      await sendEmail(m.user_email, `Payment received for ${nm}`, `Thanks! We received your payment of ${amt} for "${nm}". Your stay is confirmed. Open My Reservations in Park Aura for details.`);
      return new Response("ok", { status: 200 });
    }

    // Ignore payments that did not come from a Park Aura booking
    if (m.space_id && m.user_id) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

      const res = await fetch(
        `${supabaseUrl}/rest/v1/reservations?on_conflict=payment_intent_id`,
        {
          method: "POST",
          headers: {
            apikey: serviceKey!,
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
            Prefer: "resolution=ignore-duplicates,return=representation",
          },
          body: JSON.stringify({
            user_id: m.user_id,
            user_email: m.user_email || null,
            space_id: m.space_id,
            space_name: m.space_name || null,
            price: pi.amount_received / 100,
            hours: m.hours ? Number(m.hours) : null,
            start_time: m.start_time || null,
            booking_type: "hourly",
            status: "paid",
            owner_id: m.owner_id || null,
            owner_email: m.owner_email || null,
            payment_intent_id: pi.id,
          }),
        }
      );

      if (!res.ok) {
        console.error("Reservation insert failed:", await res.text());
        // A 500 tells Stripe to try again later
        return new Response("Insert failed", { status: 500 });
      }

      // Only email when a new booking was really created (not on a repeat delivery from Stripe)
      const created = await res.json().catch(() => []);
      if (Array.isArray(created) && created.length > 0) {
        const name = m.space_name || "your space";
        const when = m.start_time
          ? new Date(m.start_time).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" }) + " (Eastern)"
          : "the time you selected";
        const hrs = m.hours ? `${m.hours} hour${Number(m.hours) === 1 ? "" : "s"}` : "";
        const total = `$${(pi.amount_received / 100).toFixed(2)}`;
        await sendEmail(
          m.owner_email,
          `New booking at ${name}`,
          `Good news! Your space "${name}" was just booked.\n\nWhen: ${when}\nLength: ${hrs}\nTotal paid: ${total}\n\nOpen Host Dashboard in Park Aura to see the details and message the driver.`
        );
        await sendEmail(
          m.user_email,
          `Your booking at ${name} is confirmed`,
          `Thanks for booking with Park Aura!\n\nSpace: ${name}\nWhen: ${when}\nLength: ${hrs}\nTotal paid: ${total}\n\nOpen My Reservations in Park Aura for directions and to message the host.`
        );
      }
    }
  }

  return new Response("ok", { status: 200 });
});