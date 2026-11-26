// Builds the "Time / Size / Price" lines shown on booking cards.
function fmt(iso) {
  try {
    return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch (e) {
    return "";
  }
}

export function bookingLines(r, space) {
  const lines = [];
  if (r.booking_type === "long_term" && r.start_date) {
    lines.push({ label: "Dates", value: `${r.start_date} → ${r.end_date}` });
  } else if (r.start_time) {
    lines.push({ label: "Time", value: `${fmt(r.start_time)}${r.hours ? ` (${r.hours} hr${Number(r.hours) === 1 ? "" : "s"})` : ""}` });
  } else {
    lines.push({ label: "Booked", value: new Date(r.created_at).toLocaleDateString() });
  }
  if (space && space.width && space.length) {
    lines.push({ label: "Size", value: `${space.width} ft × ${space.length} ft` });
  }
  lines.push({ label: "Price", value: `$${r.price}` });
  return lines;
}

// True once the booking's time has fully passed (rating is only allowed after that).
export function bookingEnded(r) {
  const now = Date.now();
  if (r.booking_type === "long_term" && r.end_date) {
    return new Date(r.end_date + "T23:59:59").getTime() < now;
  }
  if (r.start_time) {
    const hrs = Number(r.hours) || 1;
    return new Date(r.start_time).getTime() + hrs * 3600000 < now;
  }
  return r.created_at ? new Date(r.created_at).getTime() < now - 24 * 3600000 : false;
}
