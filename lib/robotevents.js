const API_BASE = "/api/robotevents";

async function jfetch(pathAndQuery){
  const url = `${API_BASE}${pathAndQuery}`;
  const r = await fetch(url);
  if(!r.ok){
    const text = await r.text().catch(()=>``);
    throw new Error(`RoboEvents ${r.status} on ${url}\n${text}`);
  }
  return r.json();
}

function getSeasons(perPage=200, page=1){
  return jfetch(`/seasons?per_page=${perPage}&page=${page}`);
}
function getEvents(params={}, page=1){
  const qs = new URLSearchParams(params);
  qs.set("per_page", params.per_page || 200);
  qs.set("page", String(page));
  return jfetch(`/events?${qs.toString()}`);
}
function getDivisions(eventId){
  if(!eventId) throw new Error("No event selected (cannot load divisions)");
  return jfetch(`/events/${encodeURIComponent(eventId)}/divisions`);
}
function getMatchesByDivision(divisionId, perPage=250, page=1){
  if(!divisionId) throw new Error("No division selected (cannot load matches)");
  return jfetch(`/matches?division[]=${encodeURIComponent(divisionId)}&per_page=${perPage}&page=${page}`);
}
function getTeamsByEvent(eventId, perPage=250, page=1){
  if(!eventId) throw new Error("No event selected (cannot load teams)");
  return jfetch(`/teams?event[]=${encodeURIComponent(eventId)}&per_page=${perPage}&page=${page}`);
}
