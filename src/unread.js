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

const rkey = (userId) => `park_aura_seen_reviews_${userId}`;

export function getSeenReviews(userId) {
  try {
    return Number(localStorage.getItem(rkey(userId))) || 0;
  } catch (e) {
    return 0;
  }
}

export function markReviewsSeen(userId, maxId) {
  try {
    if (getSeenReviews(userId) >= maxId) return;
    localStorage.setItem(rkey(userId), String(maxId));
  } catch (e) {}
}

export async function loadHostReviews(userId) {
  const { data: spaces } = await supabase.from("spaces").select("id, name").eq("owner_id", userId);
  const ids = (spaces || []).map((s) => s.id);
  if (ids.length === 0) return { reviews: [], newCount: 0, seen: 0 };
  const nameOf = {};
  spaces.forEach((s) => { nameOf[s.id] = s.name; });
  const { data } = await supabase.from("reviews").select("*").in("space_id", ids).order("id", { ascending: false });
  const seen = getSeenReviews(userId);
  const reviews = (data || []).map((r) => ({ ...r, space_name: nameOf[r.space_id] }));
  return { reviews, newCount: reviews.filter((r) => r.id > seen).length, seen };
}
