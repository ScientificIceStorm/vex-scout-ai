// Cloudflare Pages Function: /api/robotevents/*
// Catch-all uses [[path]].js (Cloudflare convention)
export async function onRequest({ request, env }) {
  const reqUrl = new URL(request.url);

  // CORS preflight
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

  const suffix = reqUrl.pathname.replace(/^\/api\/robotevents\/?/, "");
  const upstream = new URL(`https://www.robotevents.com/api/v2/${suffix}`);
  upstream.search = reqUrl.search;

  if (!env.ROBOTEVENTS_TOKEN) {
    return json({ error: "Missing ROBOTEVENTS_TOKEN" }, 500, reqUrl.origin);
  }

  const upstreamResp = await fetch(upstream.toString(), {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${env.ROBOTEVENTS_TOKEN}`,
    },
  });

  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  headers.set("Access-Control-Allow-Origin", reqUrl.origin);
  headers.set("Vary", "Origin");

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
