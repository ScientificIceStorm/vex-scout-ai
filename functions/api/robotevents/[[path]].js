// Cloudflare Pages Function: /api/robotevents/*
// Catch-all route uses [[path]].js on Cloudflare (not [...path])
export async function onRequest({ request, env }) {
  const reqUrl = new URL(request.url);

  // Handle CORS preflight for good measure
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": reqUrl.origin,
        "Access-Control-Allow-Methods": "GET,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Vary": "Origin",
      },
    });
  }

  // Build upstream URL to RoboEvents v2
  const suffix = reqUrl.pathname.replace(/^\/api\/robotevents\/?/, ""); // everything after our prefix
  const upstream = new URL(`https://www.robotevents.com/api/v2/${suffix}`);
  upstream.search = reqUrl.search;

  // Fail fast if token missing
  if (!env.ROBOTEVENTS_TOKEN) {
    return json({ error: "Missing ROBOTEVENTS_TOKEN" }, 500, reqUrl.origin);
  }

  // Proxy
  const upstreamResp = await fetch(upstream.toString(), {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${env.ROBOTEVENTS_TOKEN}`,
    },
  });

  // Pass through body, normalize headers
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", reqUrl.origin);
  headers.set("Vary", "Origin");

  // If RoboEvents sends non-2xx, bubble it up (helps debugging)
  return new Response(upstreamResp.body, { status: upstreamResp.status, headers });
}

function json(obj, status = 200, origin = "*") {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Vary": "Origin",
    },
  });
}
