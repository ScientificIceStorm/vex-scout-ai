// Cloudflare Pages Function: /api/robotevents/*
// Proxies to https://www.robotevents.com/api/v2/* and injects your secret token.
// You will set ROBOTEVENTS_TOKEN in Cloudflare Pages settings.

export async function onRequest({ request, env }) {
  const reqUrl = new URL(request.url);
  const suffix = reqUrl.pathname.replace(/^\/api\/robotevents\/?/, "");
  const upstream = new URL(`https://www.robotevents.com/api/v2/${suffix}`);
  upstream.search = reqUrl.search;

  const resp = await fetch(upstream.toString(), {
    headers: {
      "Accept": "application/json",
      "Authorization": `Bearer ${env.ROBOTEVENTS_TOKEN}`,
    },
  });

  const headers = new Headers(resp.headers);
  headers.set("Access-Control-Allow-Origin", reqUrl.origin);
  headers.set("Vary", "Origin");
  headers.set("Content-Type", "application/json");

  return new Response(resp.body, { status: resp.status, headers });
}
