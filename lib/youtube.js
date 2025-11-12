function extractYouTubeVideoId(url){
  try{
    const u = new URL(url);
    if(u.hostname.includes("youtube.com")) return (u.searchParams.get("v")||"").trim()||null;
    if(u.hostname==="youtu.be") return u.pathname.replace("/","")||null;
  }catch{}
  return null;
}

async function fetchYouTubeVideo(videoId){
  const url = new URL("/api/youtube/videos", window.location.origin);
  url.searchParams.set("id", videoId);
  url.searchParams.set("part","snippet,liveStreamingDetails,contentDetails");
  const r = await fetch(url.toString());
  if(!r.ok) throw new Error("YouTube API error");
  return r.json();
}
