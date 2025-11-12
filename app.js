// Elements
const statusEl = document.getElementById("status");
const seasonSelect = document.getElementById("seasonSelect");
const btnReloadSeasons = document.getElementById("btnReloadSeasons");

const eventSearchEl = document.getElementById("eventSearch");
const eventFilterEl = document.getElementById("eventFilter");
const btnRefreshEvents = document.getElementById("btnRefreshEvents");
const eventsTable = document.getElementById("eventsTable");

const divisionsCard = document.getElementById("divisionsCard");
const divisionSelect = document.getElementById("divisionSelect");
const btnLoadMatches = document.getElementById("btnLoadMatches");
const testDivisionsLink = document.getElementById("testDivisionsLink");

const matchesCard = document.getElementById("matchesCard");
const matchesTable = document.getElementById("matchesTable").querySelector("tbody");

const youtubeUrlEl = document.getElementById("youtubeUrl");
const btnCheckVideo = document.getElementById("btnCheckVideo");
const videoInfoEl = document.getElementById("videoInfo");

const analysisCard = document.getElementById("analysisCard");
const analysisTable = document.getElementById("analysisTable").querySelector("tbody");
const allyTable = document.getElementById("allyTable").querySelector("tbody");
const btnExport = document.getElementById("btnExport");

let seasons=[], eventsAll=[], eventsFiltered=[], divisions=[], matches=[], teams=[];
let selectedEvent = null;
let analysisRows=[]; // {id, match_id, match_name, team, side, auton, cycle, defense, endgame, penalties, rating, notes}

// Init
window.addEventListener("load", init);
btnReloadSeasons.onclick = init;
btnRefreshEvents.onclick = refreshEvents;
eventSearchEl.oninput = filterEvents;
eventFilterEl.onchange = filterEvents;

// ---- Seasons
async function init(){
  try{
    setStatus("Loading seasons…");
    const sres = await getSeasons(200,1);
    seasons = sres?.data || [];
    if(!seasons.length){ setStatus("No seasons found (check token)"); return; }
    seasons.sort((a,b)=>a.id-b.id);
    const latest = seasons.at(-1);

    seasonSelect.innerHTML = seasons.map(s=>`<option value="${s.id}" ${s.id===latest.id?"selected":""}>${s.name || ("Season "+s.id)}</option>`).join("");
    await refreshEvents();
    setStatus("Ready.");
  }catch(e){
    setStatus(e.message);
  }
}

seasonSelect.onchange = refreshEvents;

async function refreshEvents(){
  const sid = seasonSelect.value;
  if(!sid) return;

  // reset downstream UI
  divisionsCard.hidden = true;
  matchesCard.hidden = true;
  analysisCard.hidden = true;
  selectedEvent = null;

  setStatus("Loading events…");
  eventsAll = await fetchAllEventsForSeason(sid);
  filterEvents();
  setStatus(`Loaded ${eventsAll.length} events.`);
}

async function fetchAllEventsForSeason(seasonId){
  // pull multiple pages until empty or 5 pages (sane limit)
  const out = [];
  for(let page=1; page<=5; page++){
    try{
      const res = await getEvents({ "season[]": seasonId, per_page: 200 }, page);
      const list = res?.data || [];
      out.push(...list);
      if(!res?.meta?.next_page_url && list.length < 200) break;
    }catch(e){
      // If one page fails, stop gracefully
      console.warn("Events page failed:", page, e);
      break;
    }
  }
  return out;
}

// ---- Events table & filters
function filterEvents(){
  const q = (eventSearchEl.value || "").toLowerCase().trim();
  const mode = eventFilterEl.value; // all | upcoming
  const now = Date.now();

  eventsFiltered = eventsAll.filter(ev => {
    const hay = [
      ev.sku, ev.name,
      ev.location?.city, ev.location?.region, ev.location?.state, ev.location?.country
    ].filter(Boolean).join(" ").toLowerCase();
    const passText = q ? hay.includes(q) : true;

    let passUpcoming = true;
    if(mode === "upcoming"){
      const end = new Date(ev.end).getTime();
      passUpcoming = isNaN(end) ? true : end >= now;
    }
    return passText && passUpcoming;
  });

  renderEventsTable();
}

function renderEventsTable(){
  if(!eventsFiltered.length){
    eventsTable.innerHTML = `<tr><td colspan="6">No events found. Try clearing filters.</td></tr>`;
    return;
  }
  eventsTable.innerHTML = eventsFiltered.map(ev=>{
    const loc = [ev.location?.city, ev.location?.region || ev.location?.state, ev.location?.country].filter(Boolean).join(", ");
    const dates = ev.start && ev.end ? fmtDate(ev.start)+" – "+fmtDate(ev.end) : (ev.start || "");
    const program = ev.program?.code || ev.program?.name || "";
    return `<tr>
      <td>${safe(ev.sku)}</td>
      <td>${safe(ev.name)}</td>
      <td>${safe(loc)}</td>
      <td>${safe(dates)}</td>
      <td>${safe(program)}</td>
      <td><button data-id="${ev.id}" class="btnSelectEvent">Select</button></td>
    </tr>`;
  }).join("");

  document.querySelectorAll(".btnSelectEvent").forEach(btn=>{
    btn.onclick = () => selectEvent(btn.dataset.id);
  });
}

async function selectEvent(eventId){
  try{
    if(!eventId) { setStatus("Invalid event id"); return; }
    selectedEvent = eventsAll.find(e => String(e.id) === String(eventId));
    if(!selectedEvent){ setStatus("Event not in list"); return; }

    setStatus(`Loading divisions & teams for ${selectedEvent.sku}…`);
    divisionsCard.hidden = false; // reveal card
    divisionSelect.innerHTML = `<option>Loading…</option>`;
    testDivisionsLink.textContent = "";
    testDivisionsLink.removeAttribute("href");

    const [dres, tres] = await Promise.all([
      getDivisions(eventId),
      getTeamsByEvent(eventId)
    ]);

    const divisionsData = dres?.data || [];
    divisions = divisionsData;
    teams = tres?.data || [];

    if(!divisions.length){
      divisionSelect.innerHTML = `<option value="">(No divisions found for this event)</option>`;
      btnLoadMatches.disabled = true;
    } else {
      divisionSelect.innerHTML = `<option value="">— select —</option>` + divisions.map(d=>`<option value="${d.id}">${d.name}</option>`).join("");
      btnLoadMatches.disabled = false;
    }

    // Provide a quick test link so you can see the raw JSON if needed
    testDivisionsLink.textContent = "Test divisions endpoint";
    testDivisionsLink.href = `/api/robotevents/events/${encodeURIComponent(eventId)}/divisions`;

    matchesCard.hidden = true;
    analysisCard.hidden = true;
    setStatus("Ready.");
  }catch(e){
    setStatus(e.message);
  }
}

// ---- Matches
btnLoadMatches.onclick = async () => {
  try{
    matchesTable.innerHTML = `<tr><td colspan="5">Loading…</td></tr>`;
    const id = divisionSelect.value;
    if(!id){ setStatus("Pick a division"); return; }
    const mres = await getMatchesByDivision(id, 250, 1);
    matches = mres?.data || [];
    renderMatches();
  }catch(e){ setStatus(e.message); }
};

function renderMatches(){
  matchesCard.hidden = false;
  matchesTable.innerHTML = matches.map(m=>{
    const red = (m.alliances?.red?.teams||[]).join(", ");
    const blue = (m.alliances?.blue?.teams||[]).join(", ");
    const score = `${m.alliances?.red?.score ?? "-"} : ${m.alliances?.blue?.score ?? "-"}`;
    return `<tr>
      <td>${m.name}</td>
      <td>${red}</td>
      <td>${blue}</td>
      <td>${score}</td>
      <td><button data-match="${m.id}" class="btnAnalyze">Analyze</button></td>
    </tr>`;
  }).join("");

  document.querySelectorAll(".btnAnalyze").forEach(btn=>{
    btn.onclick = () => {
      const m = matches.find(x=>String(x.id)===btn.dataset.match);
      openAnalysis(m);
    };
  });
}

// ---- Analysis
function openAnalysis(match){
  const rows = [];
  const red = [match.alliances?.red?.teams?.[0], match.alliances?.red?.teams?.[1]].filter(Boolean);
  const blue = [match.alliances?.blue?.teams?.[0], match.alliances?.blue?.teams?.[1]].filter(Boolean);
  for(const t of red) rows.push(blankRow(match,t,"red"));
  for(const t of blue) rows.push(blankRow(match,t,"blue"));

  for(const r of rows){
    if(!analysisRows.find(x=>x.id===r.id)) analysisRows.push(r);
  }
  renderAnalysis();
  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function blankRow(match, team, side){
  return {
    id:`${match.id}:${team}`,
    match_id: match.id,
    match_name: match.name,
    team,
    side,
    auton:0, cycle:0, defense:0, endgame:0, penalties:0,
    rating:0,
    notes:""
  };
}

function renderAnalysis(){
  analysisCard.hidden = false;
  analysisTable.innerHTML = analysisRows.map(r=>`
    <tr>
      <td>${r.match_name}</td>
      <td>${r.team}</td>
      <td>${r.side}</td>
      <td>${num(r.id,"auton",r.auton)}</td>
      <td>${num(r.id,"cycle",r.cycle)}</td>
      <td>${num(r.id,"defense",r.defense)}</td>
      <td>${num(r.id,"endgame",r.endgame)}</td>
      <td>${num(r.id,"penalties",r.penalties)}</td>
      <td style="text-align:center"><b>${r.rating}</b></td>
      <td><input data-id="${r.id}" data-k="notes" value="${esc(r.notes)}" class="txt" style="width:240px"/></td>
      <td><button data-id="${r.id}" class="btnRate">Rate</button></td>
    </tr>
  `).join("");

  document.querySelectorAll(".num").forEach(inp=>{
    inp.onchange = () => {
      const id = inp.dataset.id, k = inp.dataset.k;
      updateRow(id, {[k]: Number(inp.value)});
    };
  });
  document.querySelectorAll(".txt").forEach(inp=>{
    inp.oninput = () => {
      const id = inp.dataset.id, k = inp.dataset.k;
      updateRow(id, {[k]: inp.value});
    };
  });
  document.querySelectorAll(".btnRate").forEach(btn=>{
    btn.onclick = () => {
      const id = btn.dataset.id;
      rateRow(id);
    };
  });

  renderAlliances();
}

function num(id,k,val){
  return `<input type="number" min="0" max="10" step="0.5" value="${val}" data-id="${id}" data-k="${k}" class="num" style="width:80px;text-align:center"/>`;
}
function esc(s){ return String(s??"").replaceAll(`"`,`&quot;`); }

function updateRow(id, patch){
  analysisRows = analysisRows.map(r => r.id===id ? {...r, ...patch} : r);
}
function rateRow(id){
  analysisRows = analysisRows.map(r => r.id===id ? {...r, rating: computeRating(r)} : r);
  renderAnalysis();
}

function renderAlliances(){
  const byTeam = {};
  for(const r of analysisRows){
    if(!byTeam[r.team]) byTeam[r.team] = { team:r.team, auton:0, cycle:0, defense:0, endgame:0, penalties:0, n:0 };
    const t = byTeam[r.team];
    t.auton+=r.auton; t.cycle+=r.cycle; t.defense+=r.defense; t.endgame+=r.endgame; t.penalties+=r.penalties; t.n++;
  }
  const avgs = Object.values(byTeam).map(t=>({
    team:t.team,
    auton:t.auton/t.n, cycle:t.cycle/t.n, defense:t.defense/t.n, endgame:t.endgame/t.n,
    penalties:t.penalties/t.n
  }));
  const pairs=[];
  for(let i=0;i<avgs.length;i++){
    for(let j=i+1;j<avgs.length;j++){
      pairs.push({ a:avgs[i].team, b:avgs[j].team, synergy: synergyScore(avgs[i],avgs[j]) });
    }
  }
  pairs.sort((x,y)=>y.synergy - x.synergy);
  allyTable.innerHTML = pairs.slice(0,10).map(p=>`<tr><td>${p.a}</td><td>${p.b}</td><td>${p.synergy}</td></tr>`).join("");
}

// Export CSV
btnExport.onclick = () => {
  const header = ["match_id","match_name","team","side","auton","cycle","defense","endgame","penalties","rating","notes"];
  const csv = toCSV(analysisRows, header);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vex-scout-analysis.csv";
  a.click();
};

// YouTube check
btnCheckVideo.onclick = async () => {
  videoInfoEl.textContent = "Checking…";
  const vid = extractYouTubeVideoId(youtubeUrlEl.value.trim());
  if(!vid){ videoInfoEl.textContent = "Enter a valid YouTube URL."; return; }
  try{
    const res = await fetchYouTubeVideo(vid);
    const item = res?.items?.[0];
    if(!item){ videoInfoEl.textContent = "Not found."; return; }
    const live = !!item.liveStreamingDetails;
    videoInfoEl.innerHTML = `<b>Title:</b> ${item.snippet?.title || "(no title)"}<br><b>Status:</b> ${live?"Live/Live-capable":"VOD"}<br><small>videoId: ${vid}</small>`;
  }catch(e){
    videoInfoEl.textContent = e.message;
  }
};

// helpers
function setStatus(msg){ statusEl.textContent = msg; }
function safe(s){ return (s??"").toString().replace(/[<>&]/g, c=>({ "<":"&lt;",">":"&gt;","&":"&amp;" }[c])); }
function fmtDate(d){ const t = new Date(d); return isNaN(t)? String(d||""): t.toLocaleDateString(); }
