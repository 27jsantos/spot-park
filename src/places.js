// Finds train stations and landmarks inside a map box, using OpenStreetMap data (Overpass).
// If the service is slow or down, it quietly returns an empty list so the map still works.
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export async function fetchPlaces(south, west, north, east) {
  // Too zoomed out: skip, so we don't ask for the whole city at once
  if (north - south > 0.2 || east - west > 0.2) return null;
  const b = `(${south},${west},${north},${east})`;
  const q =
    `[out:json][timeout:10];(` +
    `nwr["railway"="station"]["name"]${b};` +
    `nwr["public_transport"="station"]["name"]${b};` +
    `nwr["tourism"~"^(attraction|museum|viewpoint)$"]["name"]${b};` +
    `nwr["historic"~"^(monument|castle|memorial)$"]["name"]${b};` +
    `nwr["leisure"="stadium"]["name"]${b};` +
    `);out center 60;`;
  for (const url of MIRRORS) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(q),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const seen = {};
      const list = [];
      (data.elements || []).forEach((el) => {
        const t = el.tags || {};
        const lat = el.lat !== undefined ? el.lat : el.center && el.center.lat;
        const lng = el.lon !== undefined ? el.lon : el.center && el.center.lon;
        if (!t.name || lat === undefined || lng === undefined) return;
        const kind = t.railway === "station" || t.public_transport === "station" ? "train" : "landmark";
        const key = kind + t.name;
        if (seen[key]) return;
        seen[key] = true;
        list.push({ id: el.type + el.id, name: t.name, kind, lat, lng });
      });
      return list;
    } catch (e) {
      clearTimeout(timer);
    }
  }
  return [];
}
