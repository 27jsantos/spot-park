import { supabase } from "./supabaseClient";

const key = (userId) => `park_aura_seen_${userId}`;

export function getSeen(userId) {
  try {
    return JSON.parse(localStorage.getItem(key(userId)) || "{}");
  } catch (e) {
    return {};
  }
}

export function markSeen(userId, reservationId, maxId) {
  try {
    const seen = getSeen(userId);
    if ((seen[reservationId] || 0) >= maxId) return;
    seen[reservationId] = maxId;
    localStorage.setItem(key(userId), JSON.stringify(seen));
  } catch (e) {}
}

export async function countUnreadFor(userId, reservationId) {
  const seen = getSeen(userId);
  const { data } = await supabase
    .from("messages")
    .select("id")
    .eq("reservation_id", reservationId)
    .eq("recipient_id", userId)
    .gt("id", seen[reservationId] || 0);
  return (data || []).length;
}

export async function unreadSummary(userId) {
  const seen = getSeen(userId);
  const { data: msgs } = await supabase.from("messages").select("id, reservation_id").eq("recipient_id", userId);
  const unread = (msgs || []).filter((m) => m.id > (seen[m.reservation_id] || 0));
  if (unread.length === 0) return { host: 0, driver: 0 };
  const ids = [...new Set(unread.map((m) => m.reservation_id))];
  const { data: res } = await supabase.from("reservations").select("id, owner_id").in("id", ids);
  const ownerOf = {};
  (res || []).forEach((r) => { ownerOf[r.id] = r.owner_id; });
  let host = 0;
  let driver = 0;
  unread.forEach((m) => {
    if (ownerOf[m.reservation_id] === userId) host += 1;
    else driver += 1;
  });
  return { host, driver };
}
