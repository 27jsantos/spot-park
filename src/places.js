// Finds train stations inside a map box, using OpenStreetMap Nominatim.
// If the service is slow or down, it returns "error" and the map keeps working without markers.
const QUERIES = ["railway station", "train station"];
const cache = {};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function nominatimPlaces(south, west, north, east, onPartial) {
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
    if (i > 0) await sleep(1000);
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
        const isLandmark = false;
        if (!p.name || (!isTrain && !isLandmark)) return;
        const kind = isTrain ? "train" : "landmark";
        const k = kind + p.name;
        if (seen[k]) return;
        seen[k] = true;
        list.push({ id: `${p.osm_type}${p.osm_id}`, name: p.name, kind, lat: parseFloat(p.lat), lng: parseFloat(p.lon) });
      });
      if (onPartial) onPartial(list.slice());
    } catch (e) {
      clearTimeout(timer);
    }
  }
  if (okCount === 0) return "error";
  cache[key] = list;
  return list;
}

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

// Big stations in and around New York, used only if every online lookup is down
const FALLBACK = [
  { name: "Penn Station", lat: 40.7506, lng: -73.9935 },
  { name: "Grand Central Terminal", lat: 40.7527, lng: -73.9772 },
  { name: "Jamaica Station", lat: 40.6998, lng: -73.8081 },
  { name: "Atlantic Terminal", lat: 40.6840, lng: -73.9776 },
  { name: "Woodside", lat: 40.7458, lng: -73.9030 },
  { name: "Flushing-Main St", lat: 40.7596, lng: -73.8301 },
  { name: "Long Island City", lat: 40.7414, lng: -73.9577 },
  { name: "Yankees-E 153 St", lat: 40.8250, lng: -73.9296 },
  { name: "Hoboken Terminal", lat: 40.7359, lng: -74.0290 },
  { name: "Secaucus Junction", lat: 40.7613, lng: -74.0758 },
  { name: "Newark Penn Station", lat: 40.7345, lng: -74.1645 },
  { name: "Stamford", lat: 41.0465, lng: -73.5426 },
].map((p) => ({ ...p, id: "fb" + p.name, kind: "train" }));

function fallbackPlaces(south, west, north, east) {
  return FALLBACK.filter((p) => p.lat >= south && p.lat <= north && p.lng >= west && p.lng <= east);
}

// Preferred source: OpenStreetMap Overpass (made for map-area lookups, far more complete than a text search).
// All servers are asked at the same time and the first good answer wins, so one slow server can't hold things up.
function overpassOne(url, q) {
  return new Promise((resolve, reject) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 7000);
    fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "data=" + encodeURIComponent(q),
    })
      .then((res) => {
        clearTimeout(timer);
        if (!res.ok) throw new Error("bad status");
        return res.json();
      })
      .then((data) => {
        const seen = {};
        const list = [];
        (data.elements || []).forEach((p) => {
          const name = p.tags && p.tags.name;
          if (!name || seen[name + Math.round(p.lat * 500)]) return;
          seen[name + Math.round(p.lat * 500)] = true;
          list.push({ id: `n${p.id}`, name, kind: "train", lat: p.lat, lng: p.lon });
        });
        resolve(list);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}

function overpassPlaces(south, west, north, east) {
  const q = `[out:json][timeout:15];(node["railway"~"^(station|halt)$"](${south},${west},${north},${east});node["station"="subway"](${south},${west},${north},${east}););out body 80;`;
  return new Promise((resolve) => {
    let failed = 0;
    MIRRORS.forEach((url) => {
      overpassOne(url, q).then(resolve, () => {
        failed += 1;
        if (failed === MIRRORS.length) resolve(null);
      });
    });
  });
}


// Best source: our own relay on Vercel (no browser blocks, results are cached)
async function relayPlaces(south, west, north, east) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`/api/stations?s=${south}&w=${west}&n=${north}&e=${east}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const list = await res.json();
    return Array.isArray(list) ? list : null;
  } catch (e) {
    clearTimeout(timer);
    return null;
  }
}

export async function fetchPlaces(south, west, north, east, onPartial) {
  if (north - south > 0.2 || east - west > 0.2) return null;
  const r4 = (n) => Math.round(n * 400) / 400;
  const key = [r4(south), r4(west), r4(north), r4(east)].join(",");
  if (cache[key]) return cache[key];
  const fast = (await relayPlaces(south, west, north, east)) || (await overpassPlaces(south, west, north, east));
  if (fast) {
    cache[key] = fast;
    return fast;
  }
  const slow = await nominatimPlaces(south, west, north, east, onPartial);
  if (slow === "error") {
    const local = fallbackPlaces(south, west, north, east);
    return local.length > 0 ? local : "error";
  }
  return slow;
}
