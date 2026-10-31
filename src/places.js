// Finds train stations and landmarks inside a map box, using OpenStreetMap Nominatim.
// If the service is slow or down, it returns "error" and the map keeps working without markers.
const QUERIES = ["railway station", "attraction", "museum", "stadium"];
const cache = {};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchPlaces(south, west, north, east) {
  // Too zoomed out: skip, so we don't ask for a whole city at once
  if (north - south > 0.2 || east - west > 0.2) return null;
  const r4 = (n) => Math.round(n * 400) / 400;
  const key = [r4(south), r4(west), r4(north), r4(east)].join(",");
  if (cache[key]) return cache[key];

  const viewbox = `${west},${north},${east},${south}`;
  const seen = {};
  const list = [];
  let okCount = 0;
  for (let i = 0; i < QUERIES.length; i++) {
    if (i > 0) await sleep(1100);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(QUERIES[i])}&viewbox=${viewbox}&bounded=1&limit=20`,
        { signal: ctrl.signal }
      );
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      okCount++;
      (data || []).forEach((p) => {
        const isTrain = p.category === "railway" && (p.type === "station" || p.type === "halt");
        const isLandmark = ["attraction", "museum", "monument", "memorial", "viewpoint", "castle", "stadium"].includes(p.type);
        if (!p.name || (!isTrain && !isLandmark)) return;
        const kind = isTrain ? "train" : "landmark";
        const k = kind + p.name;
        if (seen[k]) return;
        seen[k] = true;
        list.push({ id: `${p.osm_type}${p.osm_id}`, name: p.name, kind, lat: parseFloat(p.lat), lng: parseFloat(p.lon) });
      });
    } catch (e) {
      clearTimeout(timer);
    }
  }
  if (okCount === 0) return "error";
  cache[key] = list;
  return list;
}
