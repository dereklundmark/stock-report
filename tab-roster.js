/* tab-roster.js — ROSTER tab render */

function renderRoster() {
  const D = window.SMASH_DATA;
  if (!D) return '<div style="padding:60px;text-align:center;color:#5C6470;">Loading…</div>';

  const raw = S.rosterTab === 'd' ? D.dRoster : D.eRoster;
  const search = (S.rosterSearch || '').toLowerCase();
  const filtered = search
    ? raw.filter(r => r.n.toLowerCase().startsWith(search))
    : raw.slice();

  const key = S.sort;
  if (key === 'wr3') {
    filtered.sort((a, b) => {
      const ae = a.g >= 3, be = b.g >= 3;
      if (ae !== be) return ae ? -1 : 1;
      return (b.w / b.g) - (a.w / a.g) || b.w - a.w || b.g - a.g;
    });
  } else if (key === 'n') {
    filtered.sort((a, b) => a.n.localeCompare(b.n));
  } else {
    filtered.sort((a, b) => b[key] - a[key] || b.w - a.w || b.g - a.g);
  }

  const maxG = Math.max(...filtered.map(r => r.g), 1);
  const playerColor = S.rosterTab === 'd' ? '#FF5246' : '#1FA0E0';
  const sortLabels = { wr3:'win % (min 3 games)', w:'wins', g:'games played', pct:'win %', n:'name' };

  const rows = filtered.map((r, i) => {
    const slug = toSlug(r.n);
    const gbar = Math.round(r.g / maxG * 100);
    const pctOp = r.g < 3 ? 0.35 : 1;
    const pctSuffix = r.g < 3 ? '*' : '';
    const rowbg = i % 2 ? 'transparent' : 'rgba(255,255,255,.022)';
    return `<div style="padding:9px 0 9px 16px;border-bottom:1px solid rgba(255,255,255,.04);align-items:center;display:flex;background:${rowbg};"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#5C6470;">${i+1}</span></div>
<div style="padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;background:${rowbg};"><image-slot id="embl-${slug}" src="emblems/${slug}.png" shape="rect" style="width:22px;height:22px;" placeholder=""></image-slot></div>
<div style="padding:9px 8px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:6px;background:${rowbg};"><span style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;border:1px solid rgba(255,255,255,.1);border-radius:3px;padding:1px 4px;flex-shrink:0;">${r.gen||''}</span><span style="font-weight:700;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.n}</span></div>
<div style="padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;justify-content:flex-end;background:${rowbg};"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#9AA3AF;">${r.g}</span></div>
<div style="padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;justify-content:flex-end;background:${rowbg};"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:${playerColor};">${r.w}</span></div>
<div style="padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;justify-content:flex-end;background:${rowbg};"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#9AA3AF;">${r.l}</span></div>
<div style="padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;justify-content:flex-end;background:${rowbg};"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;opacity:${pctOp};">${r.pct}%${pctSuffix}</span></div>
<div style="padding:9px 16px 9px 4px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;background:${rowbg};"><span style="height:6px;background:rgba(255,255,255,.05);border-radius:3px;overflow:hidden;display:block;flex:1;"><span style="display:block;height:100%;width:${gbar}%;background:${playerColor};opacity:.85;"></span></span></div>`;
  }).join('');

  const tabBtns = [['d','DEREK','#FF5246'],['e','ELLIOT','#1FA0E0']].map(([id, label, col]) => {
    const active = S.rosterTab === id;
    return `<div onclick="setRosterTab('${id}')" style="padding:8px 18px;border-radius:7px;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;letter-spacing:.1em;cursor:pointer;background:${active?col:'transparent'};color:${active?'#fff':'#9AA3AF'};">${label}</div>`;
  }).join('');

  const sortBtns = [['wr3','Win %(3+)'],['w','Wins'],['g','Games'],['pct','Win%'],['n','A–Z']].map(([k, label]) => {
    const active = S.sort === k;
    return `<div onclick="setSort('${k}')" style="padding:7px 12px;border-radius:7px;font-family:'JetBrains Mono',monospace;font-weight:600;font-size:11px;cursor:pointer;border:1px solid rgba(255,255,255,.07);background:${active?'rgba(255,255,255,.08)':'transparent'};color:${active?'#fff':'#9AA3AF'};">${label}</div>`;
  }).join('');

  return `
<div style="max-width:1080px;margin:0 auto;padding:34px 18px 90px;">
  <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;color:#5C6470;margin-bottom:8px;">FIGHTERS · 05</div>
  <h1 style="font-weight:900;font-size:36px;letter-spacing:-.02em;margin:0 0 8px;">Full Roster</h1>
  <p style="color:#9AA3AF;font-size:15px;line-height:1.5;margin:0 0 28px;">${filtered.length} characters · sorted by ${sortLabels[S.sort]}.</p>

  <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;">
    <div style="display:flex;gap:4px;background:#0F1217;padding:4px;border-radius:10px;border:1px solid rgba(255,255,255,.06);">
      ${tabBtns}
    </div>
    <div style="display:flex;gap:5px;flex-wrap:wrap;">${sortBtns}</div>
  </div>

  <div style="background:#0F1217;border-radius:14px;border:1px solid rgba(255,255,255,.06);overflow:hidden;">
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;">
      <div style="display:grid;grid-template-columns:36px 28px minmax(120px,1fr) 46px 46px 46px 56px 90px;min-width:480px;">
        <!-- HEADER -->
        <div style="padding:8px 0 8px 16px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#5C6470;display:flex;align-items:center;">#</div>
        <div style="padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);"></div>
        <div style="padding:8px 8px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:4px;">
          <input id="roster-search" oninput="setRosterSearch(this.value)" value="${S.rosterSearch||''}" placeholder="CHARACTER" autocomplete="off" style="background:transparent;border:none;outline:none;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#EDF0F3;width:100%;padding:0;caret-color:#EDF0F3;min-width:0;" type="text">
          ${S.rosterSearch ? `<span onclick="clearRosterSearch()" style="cursor:pointer;color:#5C6470;font-size:12px;flex-shrink:0;">✕</span>` : `<span style="color:#5C6470;font-size:10px;flex-shrink:0;">🔍</span>`}
        </div>
        <div style="padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#5C6470;text-align:right;">GP</div>
        <div style="padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#5C6470;text-align:right;">W</div>
        <div style="padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#5C6470;text-align:right;">L</div>
        <div style="padding:8px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#5C6470;text-align:right;">WIN%</div>
        <div style="padding:8px 16px 8px 4px;border-bottom:1px solid rgba(255,255,255,.06);font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#5C6470;">VOL</div>
        <!-- ROWS -->
        ${rows}
      </div>
    </div>
  </div>
</div>`;
}
