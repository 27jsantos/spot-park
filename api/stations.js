// Runs on Vercel. Asks OpenStreetMap for train stations inside a map box.
// Doing this on the server means browsers and phones never get blocked.
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

async function ask(url, q) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ParkAura/1.0 (parkauraapp@gmail.com)" },
      body: "data=" + encodeURIComponent(q),
    });
    if (!res.ok) throw new Error("bad status " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  const s = Number(req.query.s);
  const w = Number(req.query.w);
  const n = Number(req.query.n);
  const e = Number(req.query.e);
  if ([s, w, n, e].some((v) => !Number.isFinite(v)) || n - s > 0.25 || e - w > 0.25 || n <= s || e <= w) {
    res.status(400).json({ error: "bad area" });
    return;
  }
  const q = `[out:json][timeout:15];(node["railway"~"^(station|halt)$"](${s},${w},${n},${e});node["station"="subway"](${s},${w},${n},${e}););out body 80;`;
  try {
    const data = await Promise.any(MIRRORS.map((u) => ask(u, q)));
    const seen = {};
    const list = [];
    (data.elements || []).forEach((p) => {
      const name = p.tags && p.tags.name;
      if (!name || seen[name + Math.round(p.lat * 500)]) return;
      seen[name + Math.round(p.lat * 500)] = true;
      list.push({ id: `n${p.id}`, name, kind: "train", lat: p.lat, lng: p.lon });
    });
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    res.status(200).json(list);
  } catch (err) {
    res.status(502).json({ error: "stations unavailable" });
  }
}
