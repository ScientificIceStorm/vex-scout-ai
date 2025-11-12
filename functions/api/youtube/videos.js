// /api/youtube/videos?part=snippet,liveStreamingDetails,contentDetails&id=VIDEO_ID
export async function onRequest({ request, env }) {
  const reqUrl = new URL(request.url);
  const part = reqUrl.searchParams.get("part") || "snippet,liveStreamingDetails,contentDetails";
  const id = reqUrl.searchParams.get("id");
  if (!id) return json({ error: "Missing id" }, 400, reqUrl.origin);
  if (!env.YOUTUBE_API_KEY) return json({ error: "Missing YOUTUBE_API_KEY" }, 500, reqUrl.origin);

  const upstream = new URL("https://www.googleapis.com/youtube/v3/videos");
  upstream.searchParams.set("part", part);
  upstream.searchParams.set("id", id);
  upstream.searchParams.set("key", env.YOUTUBE_API_KEY);

  const r = await fetch(upstream.toString());
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": reqUrl.origin,
    "Vary": "Origin",
  };
  return new Response(r.body, { status: r.status, headers });
}

function json(obj, status = 200, origin = "*") {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin, "Vary": "Origin" },
  });
}
