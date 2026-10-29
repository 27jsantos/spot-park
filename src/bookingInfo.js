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
