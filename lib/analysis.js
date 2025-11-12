function clamp(x, lo, hi){ return Math.max(lo, Math.min(hi, x)); }

function computeRating({ auton=0, cycle=0, defense=0, endgame=0, penalties=0 }){
  const score =
    0.35 * clamp(auton,0,10) +
    0.35 * clamp(cycle,0,10) +
    0.20 * clamp(endgame,0,10) +
    0.10 * clamp(defense,0,10) -
    0.20 * clamp(penalties,0,10);
  return Math.max(0, Math.min(10, Math.round(score*10)/10));
}

function synergyScore(a,b){
  const comp = (a.auton+a.cycle)*(b.endgame+b.defense) + (b.auton+b.cycle)*(a.endgame+a.defense);
  const pen = a.penalties + b.penalties;
  return Math.max(0, Math.round((comp/(1+pen))*10)/10);
}

function toCSV(rows, header){
  const esc = v => `"${String(v??"").replaceAll(`"`,`""`)}"`;
  return [header.join(","), ...rows.map(r=>header.map(h=>esc(r[h])).join(","))].join("\n");
}
