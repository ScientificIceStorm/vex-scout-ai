const API_BASE = "/api/robotevents";

async function jfetch(url){
  const r = await fetch(url);
  if(!r.ok) throw new Error(`RoboEvents error ${r.status}`);
  return r.json();
}

function getSeasons(perPage=200){
  return jfetch(`${API_BASE}/seasons?per_page=${perPage}`);
}
function getEvents(params={}){
  const qs = new URLSearchParams(params).toString();
  return jfetch(`${API_BASE}/events?${qs}`);
}
function getDivisions(eventId){
  return jfetch(`${API_BASE}/events/${eventId}/divisions`);
}
function getMatchesByDivision(divisionId, perPage=250){
  return jfetch(`${API_BASE}/matches?division[]=${divisionId}&per_page=${perPage}`);
}
function getTeamsByEvent(eventId, perPage=250){
  return jfetch(`${API_BASE}/teams?event[]=${eventId}&per_page=${perPage}`);
}
