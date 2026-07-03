/* data-layer.js
   Fetches matches + characters from Supabase for rivalry_id = 1
   and computes window.SMASH_DATA in the same shape as the old smash-data.js,
   so every tab renders exactly as before — but now from live data.
   A Realtime listener re-fetches and recomputes whenever a new match is inserted.
*/

async function loadSmashData() {
  const sb = window._supabase;

  /* ── fetch both tables in parallel ───────────────────────── */
  const [mRes, cRes] = await Promise.all([
    sb.from('matches').select('*').eq('rivalry_id', 1).order('date', { ascending: true }),
    sb.from('characters').select('*')
  ]);

  if (mRes.error) { console.error('matches fetch:', mRes.error); return; }
  if (cRes.error) { console.error('characters fetch:', cRes.error); return; }

  window.SMASH_DATA = compute(mRes.data || [], cRes.data || []);

  // Trigger a re-render if the app is already initialised
  if (typeof render === 'function' && window.SMASH_PREFS) render();
}

// Initial load
loadSmashData();

// Realtime listener — re-fetches whenever a match is inserted
window._supabase
  .channel('matches-live')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'matches' },
    () => { loadSmashData(); }
  )
  .subscribe();


/* ═══════════════════════════════════════════════════════════════
   COMPUTE
   ═══════════════════════════════════════════════════════════════ */
function compute(raw, chars) {

  /* ── helpers ──────────────────────────────────────────────── */
  const slug = n =>
    (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  const norm = n =>
    (n || '').replace(/\bPokemon\b/g, 'Pokémon')
             .replace(/Mr\. Game and Watch/gi, 'Mr. Game \u0026 Watch');

  const genCode = g => {
    if (!g) return 'X';
    const l = g.toLowerCase();
    if (l === 'male') return 'M';
    if (l === 'female') return 'F';
    return 'X';
  };

  const DAY_ORDER = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  /* ── character lookup from DB ─────────────────────────────── */
  const charByName = {};
  for (const c of chars) {
    charByName[c.name] = c;
    charByName[norm(c.name)] = c;
  }

  /* ── normalise match rows ─────────────────────────────────── */
  const ms = raw.map(m => {
    const dc  = norm(m.p1_char);
    const ec  = norm(m.p2_char);
    const dWin = m.winner === 'p1';
    return {
      ...m,
      dc, ec,
      dSlug: slug(dc),
      eSlug: slug(ec),
      dWin,
      eWin: !dWin,
      fhD: m.first_hit  === 'p1',
      fhE: m.first_hit  === 'p2',
      fsD: m.first_stock === 'p1',
      fsE: m.first_stock === 'p2',
      dK:  m.p1_kills  || 0,
      eK:  m.p2_kills  || 0,
      dScr: m.p1_screams || 0,
      eScr: m.p2_screams || 0,
      platOn: m.platforms === true,
      sd:    m.sudden_death === true,
      dateStr: (m.date || '').slice(0, 10),
      year:    (m.date || '').slice(0, 4),
      month:   (m.date || '').slice(0, 7),
      dayIdx:  new Date(m.date).getDay()   // 0=Sun
    };
  });

  /* ── totals ───────────────────────────────────────────────── */
  const games  = ms.length;
  const dW     = ms.filter(m => m.dWin).length;
  const eW     = games - dW;
  const dKills = ms.reduce((s, m) => s + m.dK, 0);
  const eKills = ms.reduce((s, m) => s + m.eK, 0);
  const dScr   = ms.reduce((s, m) => s + m.dScr, 0);
  const eScr   = ms.reduce((s, m) => s + m.eScr, 0);

  /* nights — distinct dates */
  const nightMap = {};
  for (const m of ms) {
    if (!nightMap[m.dateStr]) nightMap[m.dateStr] = { d: 0, e: 0 };
    m.dWin ? nightMap[m.dateStr].d++ : nightMap[m.dateStr].e++;
  }
  const nightVals = Object.values(nightMap);
  const nights = {
    d: nightVals.filter(n => n.d > n.e).length,
    e: nightVals.filter(n => n.e > n.d).length,
    total: nightVals.length
  };

  /* streaks */
  let dStreak = 0, eStreak = 0, curD = 0, curE = 0;
  for (const m of ms) {
    if (m.dWin) { curD++; curE = 0; } else { curE++; curD = 0; }
    if (curD > dStreak) dStreak = curD;
    if (curE > eStreak) eStreak = curE;
  }

  /* span */
  const fmt = d => {
    const [y, mo] = (d || '').split('-');
    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${MONTHS[parseInt(mo, 10) - 1]} ${y}`;
  };
  const dates = ms.map(m => m.dateStr).sort();
  const span  = dates.length ? `${fmt(dates[0])} — ${fmt(dates[dates.length - 1])}` : '';

  /* ── rosters ──────────────────────────────────────────────── */
  function buildRoster(getChar, isWin) {
    const map = {};
    for (const m of ms) {
      const n = getChar(m);
      if (!n) continue;
      if (!map[n]) {
        const c = charByName[n] || {};
        map[n] = { n, slug: slug(n), g: 0, w: 0, l: 0, pct: 0, gen: genCode(c.gender) };
      }
      map[n].g++;
      if (isWin(m)) map[n].w++;
    }
    for (const r of Object.values(map)) {
      r.l   = r.g - r.w;
      r.pct = r.g ? Math.round(r.w / r.g * 100) : 0;
    }
    return Object.values(map).sort((a, b) => b.w - a.w || b.g - a.g || a.n.localeCompare(b.n));
  }

  const dRoster = buildRoster(m => m.dc, m => m.dWin);
  const eRoster = buildRoster(m => m.ec, m => m.eWin);

  /* top-6 by games played */
  const dTop6 = dRoster.slice(0, 6);
  const eTop6 = eRoster.slice(0, 6);

  /* ── gender breakdown ─────────────────────────────────────── */
  function genderBreakdown(roster) {
    return roster.reduce((acc, c) => { acc[c.gen] = (acc[c.gen] || 0) + c.g; return acc; }, {});
  }
  const gender = { d: genderBreakdown(dRoster), e: genderBreakdown(eRoster) };

  /* ── screams by character ─────────────────────────────────── */
  function screamsByChar(getChar, getScr) {
    const map = {};
    for (const m of ms) {
      const n = getChar(m); const v = getScr(m);
      if (!n || !v) continue;
      if (!map[n]) map[n] = { n, slug: slug(n), v: 0 };
      map[n].v += v;
    }
    return Object.values(map).filter(s => s.v > 0)
      .sort((a, b) => b.v - a.v).slice(0, 8);
  }
  const dScreams = screamsByChar(m => m.dc, m => m.dScr);
  const eScreams = screamsByChar(m => m.ec, m => m.eScr);

  /* ── sudden death games ───────────────────────────────────── */
  const suddenDeath = ms.filter(m => m.sd).map(m => ({
    dc: m.dc, ec: m.ec, dslug: m.dSlug, eslug: m.eSlug,
    won: m.dWin ? 'D' : 'E'
  }));

  /* ── venue ────────────────────────────────────────────────── */
  const onlineMs  = ms.filter(m => (m.venue || '').toLowerCase() === 'online');
  const personMs  = ms.filter(m => (m.venue || '').toLowerCase() !== 'online');
  const venue = {
    online: { n: onlineMs.length, d: onlineMs.filter(m => m.dWin).length, e: onlineMs.filter(m => m.eWin).length },
    person: { n: personMs.length, d: personMs.filter(m => m.dWin).length, e: personMs.filter(m => m.eWin).length }
  };

  /* ── monthly ──────────────────────────────────────────────── */
  const monthMap = {};
  for (const m of ms) {
    if (!monthMap[m.month]) monthMap[m.month] = { m: m.month, d: 0, e: 0, venue: m.venue || 'online' };
    m.dWin ? monthMap[m.month].d++ : monthMap[m.month].e++;
  }
  const monthly = Object.values(monthMap).sort((a, b) => a.m.localeCompare(b.m));

  /* ── matchups (repeated character pairs) ─────────────────── */
  const muMap = {};
  for (const m of ms) {
    const k = `${m.dc}|${m.ec}`;
    if (!muMap[k]) muMap[k] = { d: 0, e: 0, dc: m.dc, ec: m.ec, dslug: m.dSlug, eslug: m.eSlug, n: 0 };
    muMap[k].n++;
    m.dWin ? muMap[k].d++ : muMap[k].e++;
  }
  const matchups = Object.values(muMap).filter(mu => mu.n >= 2)
    .sort((a, b) => b.n - a.n);

  /* ── win-rate series (per game running %) ─────────────────── */
  const winrateSeries = [];
  let cumD = 0;
  for (let i = 0; i < ms.length; i++) {
    if (ms[i].dWin) cumD++;
    winrateSeries.push(Math.round(cumD / (i + 1) * 1000) / 10);
  }

  /* ── form (last 20) ──────────────────────────────────────── */
  const form = ms.slice(-20).map(m => m.dWin ? 1 : 0);

  /* ── charStats from DB ─────────────────────────────────────── */
  const charStats = {};
  let wMin=Infinity, wMax=-Infinity, spMin=Infinity, spMax=-Infinity;
  let kMin=Infinity, kMax=-Infinity, cgMin=Infinity, cgMax=-Infinity;
  let rMin=Infinity, rMax=-Infinity, chMin=Infinity, chMax=-Infinity;
  for (const c of chars) {
    const dn = norm(c.name);
    charStats[dn] = { ...c, name: dn };
    if (c.weight     != null) { wMin  = Math.min(wMin,  c.weight);      wMax  = Math.max(wMax,  c.weight); }
    if (c.speed      != null) { spMin = Math.min(spMin, c.speed);       spMax = Math.max(spMax, c.speed); }
    if (c.killpower  != null) { kMin  = Math.min(kMin,  c.killpower);   kMax  = Math.max(kMax,  c.killpower); }
    if (c.combo_game != null) { cgMin = Math.min(cgMin, c.combo_game);  cgMax = Math.max(cgMax, c.combo_game); }
    if (c.recovery   != null) { rMin  = Math.min(rMin,  c.recovery);    rMax  = Math.max(rMax,  c.recovery); }
    if (c.cheese     != null) { chMin = Math.min(chMin, c.cheese);      chMax = Math.max(chMax, c.cheese); }
  }
  const scales = {
    weight:     { min: wMin,  max: wMax  },
    speed:      { min: spMin, max: spMax },
    killpower:  { min: kMin,  max: kMax  },
    combo_game: { min: cgMin, max: cgMax },
    recovery:   { min: rMin,  max: rMax  },
    cheese:     { min: chMin, max: chMax }
  };

  /* ── first stock ───────────────────────────────────────────── */
  const fsTracked = ms.filter(m => m.fsD || m.fsE);
  const dTakes    = fsTracked.filter(m => m.fsD).length;
  const dFsWins   = fsTracked.filter(m => m.fsD && m.dWin).length;
  const eTakes    = fsTracked.filter(m => m.fsE).length;
  const eFsWins   = fsTracked.filter(m => m.fsE && m.eWin).length;
  const firstStock = {
    tracked:    fsTracked.length,
    dTakes, dWins: dFsWins, dPct: dTakes ? Math.round(dFsWins / dTakes * 100) : 0,
    eTakes, eWins: eFsWins, ePct: eTakes ? Math.round(eFsWins / eTakes * 100) : 0,
    overallPct: fsTracked.length
      ? Math.round((dFsWins + eFsWins) / fsTracked.length * 100) : 0
  };

  /* ── platforms ────────────────────────────────────────────── */
  const platOn  = ms.filter(m => m.platOn);
  const platOff = ms.filter(m => !m.platOn);
  const platforms = {
    on:  { n: platOn.length,  d: platOn.filter(m=>m.dWin).length,  e: platOn.filter(m=>m.eWin).length,
           dPct: platOn.length  ? Math.round(platOn.filter(m=>m.dWin).length / platOn.length * 100) : 0 },
    off: { n: platOff.length, d: platOff.filter(m=>m.dWin).length, e: platOff.filter(m=>m.eWin).length,
           dPct: platOff.length ? Math.round(platOff.filter(m=>m.dWin).length / platOff.length * 100) : 0 }
  };

  /* ── comebacks (won despite losing first stock) ───────────── */
  const comebacks = {
    d:     ms.filter(m => m.fsE && m.dWin).length,
    e:     ms.filter(m => m.fsD && m.eWin).length,
    total: fsTracked.length
  };

  /* ── hall of shame (matches with notes) ───────────────────── */
  const hallOfShame = ms
    .filter(m => m.notes && m.notes.trim())
    .map(m => ({
      note:  m.notes,
      dc:    m.dc,
      ec:    m.ec,
      won:   m.dWin ? 'D' : 'E',
      dslug: m.dSlug,
      eslug: m.eSlug
    }));

  /* ── near-perfect (5-1) and shutout ──────────────────────── */
  const d51 = ms.filter(m =>  m.dWin && m.eK === 1).length;
  const e51 = ms.filter(m =>  m.eWin && m.dK === 1).length;
  const d52 = ms.filter(m =>  m.dWin && m.eK === 2).length;
  const e52 = ms.filter(m =>  m.eWin && m.dK === 2).length;
  const d53 = ms.filter(m =>  m.dWin && m.eK === 3).length;
  const e53 = ms.filter(m =>  m.eWin && m.dK === 3).length;
  const d5t = ms.filter(m =>  m.dWin).reduce((s,m) => s + (m.eK||0), 0);
  const e5t = ms.filter(m =>  m.eWin).reduce((s,m) => s + (m.dK||0), 0);
  const dShutout = ms.find(m => m.dWin && m.eK === 0);
  const eShutout = ms.find(m => m.eWin && m.dK === 0);
  const dClosest = ms.filter(m => m.dWin).sort((a,b) => a.eK - b.eK)[0];
  const eClosest = ms.filter(m => m.eWin).sort((a,b) => a.dK - b.dK)[0];
  const shutout = {
    d: ms.filter(m => m.dWin && m.eK === 0).length,
    e: ms.filter(m => m.eWin && m.dK === 0).length,
    d51, d52, d53, e51, e52, e53,
    d5total: d5t, e5total: e5t,
    dClosest: dClosest ? { opp: dClosest.eK, dc: dClosest.dc, ec: dClosest.ec, date: dClosest.dateStr } : null,
    eClosest: eClosest ? { opp: eClosest.dK, dc: eClosest.dc, ec: eClosest.ec, date: eClosest.dateStr } : null
  };
  const nearPerfect = { d: d51, e: e51 };

  /* ── loss rage screams ────────────────────────────────────── */
  const dWins   = ms.filter(m => m.dWin);
  const dLosses = ms.filter(m => m.eWin);
  const eWins2  = ms.filter(m => m.eWin);
  const eLosses = ms.filter(m => m.dWin);
  const dScreaming = n => n.filter(m => m.dScr > 0).length;
  const eScreaming = n => n.filter(m => m.eScr > 0).length;
  const lossRageScream = {
    dWinPct:  dWins.length   ? Math.round(dScreaming(dWins)   / dWins.length   * 100) : 0,
    dLossPct: dLosses.length ? Math.round(dScreaming(dLosses) / dLosses.length * 100) : 0,
    eWinPct:  eWins2.length  ? Math.round(eScreaming(eWins2)  / eWins2.length  * 100) : 0,
    eLossPct: eLosses.length ? Math.round(eScreaming(eLosses) / eLosses.length * 100) : 0
  };

  /* ── loudest game ─────────────────────────────────────────── */
  const loudest = ms
    .map(m => ({ ...m, total: m.dScr + m.eScr }))
    .sort((a, b) => b.total - a.total)[0];
  const loudestGame = loudest
    ? { screams: loudest.total, dc: loudest.dc, ec: loudest.ec,
        won: loudest.dWin ? 'D' : 'E', dcSlug: loudest.dSlug, ecSlug: loudest.eSlug }
    : {};

  /* ── jigglypuff curse ────────────────────────────────────── */
  const jpMs = ms.filter(m => m.ec.toLowerCase().includes('jigglypuff'));
  const jigglypuffCurse = {
    games:  jpMs.length,
    dWins:  jpMs.filter(m => m.dWin).length,
    dPct:   jpMs.length ? Math.round(jpMs.filter(m=>m.dWin).length / jpMs.length * 100) : 0
  };

  /* ── first hit scream ────────────────────────────────────── */
  const fhTracked = ms.filter(m => m.fhD || m.fhE);
  const firstHitScream = {
    eScrOnDHit: fhTracked.filter(m => m.fhD && m.eScr > 0).length,
    dScrOnEHit: fhTracked.filter(m => m.fhE && m.dScr > 0).length
  };

  /* ── day of week ──────────────────────────────────────────── */
  const dowMap = {};
  for (const m of ms) {
    const day = DAY_ORDER[m.dayIdx];
    if (!dowMap[day]) dowMap[day] = { day, n: 0, d: 0, e: 0, dPct: 0 };
    dowMap[day].n++;
    if (m.dWin) dowMap[day].d++; else dowMap[day].e++;
  }
  for (const d of Object.values(dowMap))
    d.dPct = d.n ? Math.round(d.d / d.n * 100) : 0;
  const dayOfWeek = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
    .filter(d => dowMap[d]).map(d => dowMap[d]);

  /* ── master character list ───────────────────────────────── */
  const masterChars = [...new Set(chars.map(c => norm(c.name)))].sort();

  /* ── close games (5-4: loser had 4 kills) ─────────────────── */
  const closeMs = ms.filter(m => Math.min(m.dK, m.eK) >= 4);
  const closeGames = { n: closeMs.length, dW: closeMs.filter(m => m.dWin).length };

  /* ── year by year ─────────────────────────────────────────── */
  const ybMap = {};
  for (const m of ms) {
    if (!ybMap[m.year]) ybMap[m.year] = { y: m.year, d: 0, e: 0, n: 0 };
    ybMap[m.year].n++;
    m.dWin ? ybMap[m.year].d++ : ybMap[m.year].e++;
  }
  const yearByYear = Object.values(ybMap)
    .sort((a, b) => a.y.localeCompare(b.y))
    .map(y => ({ ...y,
      dPct: y.n ? Math.round(y.d / y.n * 100) : 0,
      ePct: y.n ? Math.round(y.e / y.n * 100) : 0
    }));

  /* ── assemble ─────────────────────────────────────────────── */
  return {
    totals:     { games, dW, eW, dKills, eKills, dScr, eScr, nights, streak: { d: dStreak, e: eStreak }, span },
    gender,
    dRoster, eRoster, dTop6, eTop6,
    dScreams, eScreams,
    suddenDeath, venue, monthly, matchups,
    winrateSeries, form,
    charStats, scales,
    firstStock, platforms, comebacks,
    hallOfShame, nearPerfect, lossRageScream,
    loudestGame, jigglypuffCurse, firstHitScream,
    dayOfWeek, masterChars,
    shutout, closeGames, yearByYear
  };
}
