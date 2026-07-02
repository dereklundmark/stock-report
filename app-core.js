/* ================================================================
   STOCK ✦ REPORT — app-core.js
   Vanilla JS SPA. No framework, no build step.
   Requires: smash-data.js, smash-prefs.js, image-slot.js,
             tab-home.js, tab-teamsheet.js, tab-battlegrounds.js,
             tab-lore.js, tab-roster.js, tab-session.js
   ================================================================ */

/* ─── STATE ─────────────────────────────────────────────────── */

const S = {
  tab: 'home',
  rosterTab: 'd',
  sort: 'wr3',
  profileMode: 'top20',
  rosterSearch: '',
  showNav: false,
  showSession: false,
  sessionScreen: 'login',   // login | select | create | session
  isLoggedIn: false,
  loginEmail: '',
  loginPassword: '',
  loginError: '',
  loginLoading: false,
  isAdmin: true,
  createP1: '',
  createP2: '',
  createP1Color: '#FF5246',
  createP2Color: '#1FA0E0',
  createInviteEmail: '',
  createError: '',
  dashboards: [
    { id: 'derek-elliot', name: 'Derek vs Elliot', p1: 'Derek', p2: 'Elliot', p1c: '#FF5246', p2c: '#1FA0E0', games: 171 }
  ],
  activeDashboard: null,
  sessionVenue: 'online',
  sessionStep: 0,   // 0/1 = pick Derek, 2 = pick Elliot, 3 = stats form
  currentMatch: {
    dc: '', ec: '', dcSlug: '', ecSlug: '',
    outcome: '', platform: 'Y',
    dKills: 0, eKills: 0,
    dScr: 0, eScr: 0,
    fh: '', fs: '', sd: 'N', note: ''
  },
  sessionMatches: []
};

// Restore persisted state
try {
  const t = localStorage.getItem('smash_tab');
  if (t && ['home','prefs','battlegrounds','lore','roster'].includes(t)) S.tab = t;
  const sm = localStorage.getItem('smash_session_matches');
  if (sm) S.sessionMatches = JSON.parse(sm);
} catch(e) {}


/* ─── UTILITIES ──────────────────────────────────────────────── */

const toSlug = n =>
  (n || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');

const fixUni = s =>
  (s || '').replace(/Pok[^a-zA-Z]*mon/gi, 'Pokémon');

function rankWinrate(roster) {
  return (roster || [])
    .filter(c => c.g >= 3)
    .map(c => ({ ...c, wr: c.g ? c.w / c.g : 0 }))
    .sort((a, b) => b.wr - a.wr || b.w - a.w || b.g - a.g);
}

function statAvg(slice, field) {
  const CS = (window.SMASH_DATA || {}).charStats || {};
  let sum = 0, wsum = 0;
  for (const c of slice) {
    const s = CS[c.n];
    if (!s || typeof s[field] !== 'number') continue;
    sum += s[field] * c.g;
    wsum += c.g;
  }
  return wsum ? sum / wsum : 0;
}

function topTierShare(slice) {
  const CS = (window.SMASH_DATA || {}).charStats || {};
  let topG = 0, total = 0;
  for (const c of slice) {
    const s = CS[c.n];
    total += c.g;
    if (s && typeof s.ranking_2026 === 'number' && s.ranking_2026 <= 15) topG += c.g;
  }
  return total ? topG / total : 0;
}

function universeCounts(slice) {
  const CS = (window.SMASH_DATA || {}).charStats || {};
  const u = {};
  for (const c of slice) {
    const s = CS[c.n];
    if (!s) continue;
    u[s.universe] = (u[s.universe] || 0) + c.g;
  }
  return u;
}

function genderSplit(slice) {
  const CS = (window.SMASH_DATA || {}).charStats || {};
  let M = 0, F = 0, X = 0, total = 0;
  for (const c of slice) {
    const s = CS[c.n];
    if (!s) continue;
    const g = c.g; total += g;
    if (s.gender === 'Male') M += g;
    else if (s.gender === 'Female') F += g;
    else X += g;
  }
  if (!total) return { M: 0, F: 0, X: 0 };
  return {
    M: Math.round(M / total * 100),
    F: Math.round(F / total * 100),
    X: Math.round(X / total * 100)
  };
}

function teamAvg(slice, field) {
  const CS = (window.SMASH_DATA || {}).charStats || {};
  let sum = 0, n = 0;
  for (const c of slice) {
    const s = CS[c.n];
    if (!s || typeof s[field] !== 'number') continue;
    sum += s[field]; n++;
  }
  return n ? sum / n : 0;
}

const classifyWeight = v => v < 80 ? 'Featherweight' : v < 95 ? 'Lightweight' : v < 105 ? 'Middleweight' : v < 115 ? 'Cruiserweight' : 'Heavyweight';
const classifySpeed  = v => v < 3 ? 'Slow' : v < 4.5 ? 'Steady' : v < 5.5 ? 'Quick' : v < 6.5 ? 'Fast' : 'Lightning';
const classifyPower  = v => v < 115 ? 'Light hitters' : v < 130 ? 'Solid' : v < 145 ? 'Hard hitters' : 'Crushing';
const classifyCombo  = v => v < 28 ? 'Simple' : v < 33 ? 'Balanced' : v < 38 ? 'Technical' : 'Tech wizards';

function teamAttrs(slice) {
  if (!slice || !slice.length) return {};
  const CS = (window.SMASH_DATA || {}).charStats || {};
  const w = teamAvg(slice, 'weight'), sp = teamAvg(slice, 'speed');
  const kp = teamAvg(slice, 'killpower'), co = teamAvg(slice, 'combo_game');
  let M = 0, F = 0, X = 0;
  for (const c of slice) {
    const s = CS[c.n]; if (!s) continue;
    if (s.gender === 'Male') M++; else if (s.gender === 'Female') F++; else X++;
  }
  let topN = 0;
  for (const c of slice) {
    const s = CS[c.n];
    if (s && typeof s.ranking_2026 === 'number' && s.ranking_2026 <= 15) topN++;
  }
  const u = {};
  for (const c of slice) {
    const s = CS[c.n]; if (!s) continue;
    u[s.universe] = (u[s.universe] || 0) + c.g;
  }
  let topU = null, topUn = 0;
  for (const k in u) if (u[k] > topUn) { topU = k; topUn = u[k]; }
  return {
    weightLabel: classifyWeight(w), weightVal: w.toFixed(0),
    speedLabel: classifySpeed(sp),  speedVal: sp.toFixed(1),
    powerLabel: classifyPower(kp),  powerVal: kp.toFixed(0),
    comboLabel: classifyCombo(co),  comboVal: co.toFixed(0),
    gM: M, gF: F, gX: X,
    tierShare: Math.round(topN / slice.length * 100),
    tierShareLabel: `${topN} of ${slice.length} in 2026 Top 15`,
    universe: fixUni(topU || ''), universeShare: topUn
  };
}

function topUni(obj, n) {
  const arr = Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
  const max = arr.length ? Math.max(...arr.map(e => e[1])) : 1;
  return arr.map(([u, ct]) => ({ u: fixUni(u), n: ct, w: Math.round(ct / max * 100) }));
}

function makePortrait(charSrc, iconSrc, tint) {
  return `<div style="position:relative;width:100%;height:100%;overflow:visible;">
    ${iconSrc ? `<img src="${iconSrc}" alt="" style="position:absolute;width:220%;height:220%;top:-60%;left:-60%;object-fit:contain;opacity:0.18;filter:brightness(0) invert(1) ${tint};pointer-events:none;z-index:0;">` : ''}
    ${charSrc ? `<img src="${charSrc}" alt="" style="position:relative;width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 3px 10px rgba(0,0,0,.45));z-index:1;">` : ''}
  </div>`;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ─── NAV ────────────────────────────────────────────────────── */

function renderNav() {
  const TABS = [
    ['home','HOME'],
    ['prefs','TEAM SHEET'],
    ['battlegrounds','BATTLEGROUNDS'],
    ['lore','LORE'],
    ['roster','ROSTER']
  ];

  const dtabs = TABS.map(([id, label]) => {
    const active = S.tab === id;
    return `<div onclick="setTab('${id}')" style="padding:14px 11px 12px;cursor:pointer;position:relative;flex-shrink:0;">
      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:10px;letter-spacing:.12em;color:${active ? '#FFFFFF' : '#5C6470'};white-space:nowrap;">${label}</span>
      <div style="position:absolute;left:6px;right:6px;bottom:0;height:2px;border-radius:2px 2px 0 0;background:${active ? '#FFFFFF' : 'transparent'};"></div>
    </div>`;
  }).join('');

  const drawer = S.showNav ? `<div style="border-top:1px solid rgba(255,255,255,.07);padding:8px 0;">${
    TABS.map(([id, label]) => `<div onclick="setTab('${id}')" style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,.04);">
      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:12px;letter-spacing:.14em;color:${S.tab === id ? '#FFFFFF' : '#5C6470'};">${label}</span>
      <div style="width:6px;height:6px;border-radius:50%;background:${S.tab === id ? '#FFFFFF' : 'transparent'};"></div>
    </div>`).join('')
  }</div>` : '';

  return `<div style="max-width:960px;margin:0 auto;padding:0 14px;display:flex;align-items:stretch;justify-content:space-between;min-height:52px;">
    <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;padding:14px 0;">
      <span style="font-weight:900;font-size:13px;color:#FF5246;letter-spacing:.04em;">STOCK</span>
      <span style="font-family:'JetBrains Mono',monospace;font-weight:700;font-size:10px;color:#5C6470;">✦</span>
      <span style="font-weight:900;font-size:13px;color:#1FA0E0;letter-spacing:.04em;">REPORT</span>
    </div>
    <div class="tabs-desktop">${dtabs}</div>
    <div style="display:flex;align-items:center;gap:8px;padding:8px 0 8px 8px;flex-shrink:0;">
      <div onclick="openSession()" style="display:flex;align-items:center;gap:5px;padding:7px 12px;border-radius:8px;background:linear-gradient(135deg,#C5241B,#0C6AAC);cursor:pointer;font-family:'JetBrains Mono',monospace;font-weight:800;font-size:10px;letter-spacing:.1em;color:#fff;white-space:nowrap;">+ SESSION</div>
      <div class="tabs-mobile-btn" onclick="toggleNav()" style="padding:6px;cursor:pointer;flex-direction:column;gap:4px;align-items:center;justify-content:center;">
        <span style="display:block;width:20px;height:2px;background:#EDF0F3;border-radius:2px;"></span>
        <span style="display:block;width:20px;height:2px;background:#EDF0F3;border-radius:2px;"></span>
        <span style="display:block;width:20px;height:2px;background:#EDF0F3;border-radius:2px;"></span>
      </div>
    </div>
  </div>${drawer}`;
}


/* ─── EVENT HANDLERS ─────────────────────────────────────────── */

function setTab(tab) {
  Object.assign(S, { tab, showNav: false });
  try { localStorage.setItem('smash_tab', tab); } catch(e) {}
  window.scrollTo(0, 0);
  render();
}
function toggleNav() { S.showNav = !S.showNav; render(); }
function openSession() {
  Object.assign(S, { showSession: true, sessionScreen: S.isLoggedIn ? 'select' : 'login' });
  render();
}
function closeSession() { S.showSession = false; render(); }
function diveDeeper() { setTab('prefs'); }

// Auth
function setLoginEmail(val) { Object.assign(S, { loginEmail: val, loginError: '' }); render(); }
function setLoginPassword(val) { Object.assign(S, { loginPassword: val, loginError: '' }); render(); }
function submitLogin() {
  if (!S.loginEmail || !S.loginPassword) {
    S.loginError = 'Please enter your email and password.';
    render(); return;
  }
  Object.assign(S, { loginLoading: true, loginError: '' }); render();
  setTimeout(() => {
    if (S.loginPassword === 'smash') {
      Object.assign(S, { isLoggedIn: true, loginLoading: false, loginError: '', sessionScreen: 'select' });
    } else {
      Object.assign(S, { loginLoading: false, loginError: 'Incorrect email or password.' });
    }
    render();
  }, 800);
}
function submitLoginOnEnter(e) { if (e.key === 'Enter') submitLogin(); }
function logout() {
  Object.assign(S, { isLoggedIn: false, sessionScreen: 'login', loginEmail: '', loginPassword: '', loginError: '' });
  render();
}

// Dashboard
function selectDashboard(id) { Object.assign(S, { activeDashboard: id, sessionScreen: 'session' }); render(); }
function goCreateDashboard() { S.sessionScreen = 'create'; render(); }
function goBackToSelect() { S.sessionScreen = S.dashboards.length > 1 ? 'select' : 'session'; render(); }
function setCreateP1(val) { S.createP1 = val; render(); }
function setCreateP2(val) { S.createP2 = val; render(); }
function setCreateP1Color(c) { S.createP1Color = c; render(); }
function setCreateP2Color(c) { S.createP2Color = c; render(); }
function setCreateInviteEmail(val) { S.createInviteEmail = val; render(); }
function submitCreateDashboard() {
  if (!S.createP1 || !S.createP2) { S.createError = 'Both player names are required.'; render(); return; }
  const nd = {
    id: S.createP1.toLowerCase().replace(/\s/g,'-') + '-' + S.createP2.toLowerCase().replace(/\s/g,'-'),
    name: S.createP1 + ' vs ' + S.createP2,
    p1: S.createP1, p2: S.createP2,
    p1c: S.createP1Color, p2c: S.createP2Color, games: 0
  };
  Object.assign(S, {
    dashboards: [...S.dashboards, nd], activeDashboard: nd.id,
    sessionScreen: 'select', createP1: '', createP2: '', createInviteEmail: '', createError: ''
  });
  render();
}

// Venue
function setOnline() { S.sessionVenue = 'online'; render(); }
function setInPerson() { S.sessionVenue = 'person'; render(); }

// Character pick (tab-session.js sets _sessionChars before rendering)
function pickChar(idx) {
  const c = (window._sessionChars || [])[idx];
  if (!c) return;
  if (S.sessionStep <= 1) {
    Object.assign(S.currentMatch, { dc: c.n, dcSlug: c.slug });
    S.sessionStep = 2;
  } else if (S.sessionStep === 2) {
    Object.assign(S.currentMatch, { ec: c.n, ecSlug: c.slug });
    S.sessionStep = 3;
  }
  render();
}

function goPickD() {
  Object.assign(S.currentMatch, { dc:'',ec:'',dcSlug:'',ecSlug:'',outcome:'',dKills:0,eKills:0,dScr:0,eScr:0,fh:'',fs:'',sd:'N',note:'' });
  S.sessionStep = 1; render();
}

// Match stats
function setDerekWin() { S.currentMatch.outcome = 'D'; render(); }
function setElliotWin() { S.currentMatch.outcome = 'E'; render(); }
function dKillMinus() { S.currentMatch.dKills = Math.max(0, (S.currentMatch.dKills||0) - 1); render(); }
function dKillPlus()  { S.currentMatch.dKills = Math.min(5, (S.currentMatch.dKills||0) + 1); render(); }
function eKillMinus() { S.currentMatch.eKills = Math.max(0, (S.currentMatch.eKills||0) - 1); render(); }
function eKillPlus()  { S.currentMatch.eKills = Math.min(5, (S.currentMatch.eKills||0) + 1); render(); }
function dScrMinus()  { S.currentMatch.dScr = Math.max(0, (S.currentMatch.dScr||0) - 1); render(); }
function dScrPlus()   { S.currentMatch.dScr = (S.currentMatch.dScr||0) + 1; render(); }
function eScrMinus()  { S.currentMatch.eScr = Math.max(0, (S.currentMatch.eScr||0) - 1); render(); }
function eScrPlus()   { S.currentMatch.eScr = (S.currentMatch.eScr||0) + 1; render(); }
function togglePlatform() { S.currentMatch.platform = S.currentMatch.platform === 'Y' ? 'N' : 'Y'; render(); }
function toggleSD()       { S.currentMatch.sd = S.currentMatch.sd === 'Y' ? 'N' : 'Y'; render(); }
function setFHD() { S.currentMatch.fh = S.currentMatch.fh === 'D' ? '' : 'D'; render(); }
function setFHE() { S.currentMatch.fh = S.currentMatch.fh === 'E' ? '' : 'E'; render(); }
function setFSD() { S.currentMatch.fs = S.currentMatch.fs === 'D' ? '' : 'D'; render(); }
function setFSE() { S.currentMatch.fs = S.currentMatch.fs === 'E' ? '' : 'E'; render(); }
function setNote(val)  { S.currentMatch.note = val; } // No render — textarea updates itself

function logMatch() {
  const cm = S.currentMatch;
  if (!cm.dc || !cm.ec || !cm.outcome) return;
  const match = { ...cm, venue: S.sessionVenue, date: new Date().toISOString().slice(0, 10) };
  const nm = [...S.sessionMatches, match];
  S.sessionMatches = nm;
  Object.assign(S.currentMatch, { dc:'',ec:'',dcSlug:'',ecSlug:'',outcome:'',dKills:0,eKills:0,dScr:0,eScr:0,fh:'',fs:'',sd:'N',note:'' });
  S.sessionStep = 1;
  try { localStorage.setItem('smash_session_matches', JSON.stringify(nm)); } catch(e) {}
  render();
}
function deleteMatch(i) {
  const nm = S.sessionMatches.filter((_, idx) => idx !== i);
  S.sessionMatches = nm;
  try { localStorage.setItem('smash_session_matches', JSON.stringify(nm)); } catch(e) {}
  render();
}
function editMatch(i) {
  const m = S.sessionMatches[i];
  const nm = S.sessionMatches.filter((_, idx) => idx !== i);
  S.sessionMatches = nm;
  Object.assign(S.currentMatch, { ...m });
  S.sessionStep = 3;
  try { localStorage.setItem('smash_session_matches', JSON.stringify(nm)); } catch(e) {}
  render();
}
function clearSession() {
  S.sessionMatches = []; S.sessionStep = 0;
  try { localStorage.removeItem('smash_session_matches'); } catch(e) {}
  render();
}

// Roster
function setRosterSearch(val) { S.rosterSearch = val; render(); }
function clearRosterSearch() { S.rosterSearch = ''; render(); }
function setRosterTab(tab) { S.rosterTab = tab; render(); }
function setSort(key) { S.sort = key; render(); }
function setProfileMode(mode) { S.profileMode = mode; render(); }


/* ─── MAIN RENDER ────────────────────────────────────────────── */

function render() {
  const D = window.SMASH_DATA, P = window.SMASH_PREFS;
  if (!D || !P) return;

  // Save focused input state
  const ae = document.activeElement;
  const fid = ae && ae.id ? ae.id : null;
  let ss = null, se = null;
  try { ss = ae.selectionStart; se = ae.selectionEnd; } catch(e) {}

  // Nav
  const nav = document.getElementById('nav');
  if (nav) nav.innerHTML = renderNav();

  // Tab content
  const content = document.getElementById('tab-content');
  if (content) {
    switch (S.tab) {
      case 'home':          content.innerHTML = renderHome(); break;
      case 'prefs':         content.innerHTML = renderTeamSheet(); break;
      case 'battlegrounds': content.innerHTML = renderBattlegrounds(); break;
      case 'lore':          content.innerHTML = renderLore(); break;
      case 'roster':        content.innerHTML = renderRoster(); break;
      default:              content.innerHTML = renderHome();
    }
  }

  // Session overlay
  const sess = document.getElementById('session-overlay');
  if (sess) {
    if (S.showSession) {
      sess.style.display = 'flex';
      sess.innerHTML = renderSession();
    } else {
      sess.style.display = 'none';
      sess.innerHTML = '';
    }
  }

  // Restore focus
  if (fid) {
    const el = document.getElementById(fid);
    if (el) {
      el.focus();
      try { if (ss !== null) el.setSelectionRange(ss, se); } catch(e) {}
    }
  }
}


/* ─── INIT ───────────────────────────────────────────────────── */

function init() {
  if (window.SMASH_DATA && window.SMASH_PREFS) { render(); return; }
  const poll = setInterval(() => {
    if (window.SMASH_DATA && window.SMASH_PREFS) { clearInterval(poll); render(); }
  }, 40);
}

document.addEventListener('DOMContentLoaded', init);
