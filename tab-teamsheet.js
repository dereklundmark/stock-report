/* tab-teamsheet.js — TEAM SHEET tab render */

function renderTeamSheet() {
  const D = window.SMASH_DATA;
  if (!D) return '<div style="padding:60px;text-align:center;color:#5C6470;">Loading…</div>';

  const dRanked = rankWinrate(D.dRoster);
  const eRanked = rankWinrate(D.eRoster);
  const dTop6Raw = dRanked.slice(0, 6);
  const eTop6Raw = eRanked.slice(0, 6);
  while (dTop6Raw.length < 6) dTop6Raw.push({ n: '—', slug: '_', w: 0, l: 0, pct: 0, g: 0 });
  while (eTop6Raw.length < 6) eTop6Raw.push({ n: '—', slug: '_', w: 0, l: 0, pct: 0, g: 0 });
  const dTop6 = dTop6Raw.map(c => ({ ...c, slug: toSlug(c.n) }));
  const eTop6 = eTop6Raw.map(c => ({ ...c, slug: toSlug(c.n) }));
  const dTA = teamAttrs(dTop6.filter(c => c.n !== '—'));
  const eTA = teamAttrs(eTop6.filter(c => c.n !== '—'));

  const dSlice = S.profileMode === 'top20' ? dRanked.slice(0, 15) : D.dRoster;
  const eSlice = S.profileMode === 'top20' ? eRanked.slice(0, 15) : D.eRoster;

  const sc = D.scales || { weight:{min:60,max:135}, speed:{min:1,max:9}, killpower:{min:80,max:170}, combo_game:{min:20,max:50}, recovery:{min:1,max:9} };
  const pos = (v, scale) => Math.max(0, Math.min(100, ((v - scale.min) / (scale.max - scale.min)) * 100));

  const statsSpec = [
    { key:'weight',     label:'WEIGHT',     loLabel:'LIGHT',   hiLabel:'HEAVY',     scale:sc.weight },
    { key:'speed',      label:'SPEED',      loLabel:'SLOW',    hiLabel:'FAST',      scale:sc.speed },
    { key:'killpower',  label:'KILL POWER', loLabel:'SOFT',    hiLabel:'CRUSHING',  scale:sc.killpower },
    { key:'combo_game', label:'COMBO GAME', loLabel:'SIMPLE',  hiLabel:'TECHNICAL', scale:sc.combo_game },
    { key:'recovery',   label:'RECOVERY',   loLabel:'WEAK',    hiLabel:'STRONG',    scale:sc.recovery }
  ];

  const profileStats = statsSpec.map(s => {
    const dV = statAvg(dSlice, s.key), eV = statAvg(eSlice, s.key);
    const dPos = pos(dV, s.scale), ePos = pos(eV, s.scale);
    return { ...s, dPos: dPos.toFixed(1), ePos: ePos.toFixed(1), dFmt: Math.round(dPos) + '%', eFmt: Math.round(ePos) + '%' };
  });

  const dTopTier = Math.round(topTierShare(dSlice) * 100);
  const eTopTier = Math.round(topTierShare(eSlice) * 100);
  const tierDiff = Math.abs(dTopTier - eTopTier);
  const tierNote = tierDiff <= 5
    ? `Both players pick from the 2026 Top 15 at roughly the same rate (${dTopTier}% vs ${eTopTier}%).`
    : `${dTopTier > eTopTier ? 'Derek' : 'Elliot'} leans more heavily into 2026 Top 15 characters (${dTopTier}% vs ${eTopTier}%).`;

  const dG = genderSplit(dSlice), eG = genderSplit(eSlice);
  const genderNote = (dG.M > 60 && eG.M > 60)
    ? `Both lean heavily male. ${eG.M < dG.M ? 'Elliot' : 'Derek'} mixes it up slightly more.`
    : 'Both players run a diverse gender mix.';

  const dUniv = topUni(universeCounts(D.dRoster), 6);
  const eUniv = topUni(universeCounts(D.eRoster), 6);

  const pmLabel = S.profileMode === 'top20' ? 'TOP 15' : 'ALL PICKS';
  const pmNote = S.profileMode === 'top20'
    ? "Weighted across each player's top 15 characters by win rate (min 3 games)."
    : "Weighted across every character played, by games played.";

  const matchups = (D.matchups || []).map(m => {
    const dShare = Math.round(100 * m.d / m.n);
    let verdict;
    if (m.d > m.e) verdict = 'DEREK +' + (m.d - m.e);
    else if (m.e > m.d) verdict = 'ELLIOT +' + (m.e - m.d);
    else verdict = 'EVEN';
    return { ...m, dShare, verdict, dslug: toSlug(m.dc), eslug: toSlug(m.ec) };
  });
  const dMatchups = matchups.filter(m => m.d > m.e).sort((a, b) => b.n - a.n);
  const tMatchups = matchups.filter(m => m.d === m.e).sort((a, b) => b.n - a.n);
  const eMatchups = matchups.filter(m => m.e > m.d).sort((a, b) => b.n - a.n);

  const sd = D.suddenDeath || [];
  const sdDerek = sd.filter(s => s.won === 'D');
  const sdElliot = sd.filter(s => s.won === 'E');

  function charCard(c, col) {
    const rgba = col === '#FF5246' ? '255,82,70' : '31,160,224';
    const pct = c.n === '—' ? 0 : (c.g > 0 ? Math.round(c.w / c.g * 100) : 0);
    return `<div>
      <div style="position:relative;width:100%;aspect-ratio:1;border-radius:6px;overflow:hidden;background:rgba(${rgba},.10);">
        <image-slot id="ccard-${c.slug}-${col==='#FF5246'?'d':'e'}" src="characters/${c.slug}.png" fit="contain" shape="rect" style="width:100%;height:100%;filter:drop-shadow(0 4px 10px rgba(0,0,0,.4));"></image-slot>
      </div>
      <div style="font-weight:800;font-size:12.5px;margin-top:7px;line-height:1.2;word-break:break-word;">${c.n}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${col};">${c.w}–${c.l} · ${pct}%</div>
    </div>`;
  }

  function attrsPanel(ta, col) {
    if (!ta || !ta.weightLabel) return '';
    const rgba = col === '#FF5246' ? '255,82,70' : '31,160,224';
    const dash = col === '#FF5246' ? '255,82,70' : '31,160,224';
    return `<div style="margin-top:16px;padding:14px;background:rgba(${rgba},.06);border:1px solid rgba(${rgba},.18);border-radius:10px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.18em;color:${col};font-weight:700;margin-bottom:10px;">TEAM TRAITS</div>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 14px;">
        <div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#7C8694;">WEIGHT</div><div style="font-weight:800;font-size:13px;">${ta.weightLabel}</div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">avg ${ta.weightVal}</div></div>
        <div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#7C8694;">SPEED</div><div style="font-weight:800;font-size:13px;">${ta.speedLabel}</div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">avg ${ta.speedVal}/9</div></div>
        <div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#7C8694;">KILL POWER</div><div style="font-weight:800;font-size:13px;">${ta.powerLabel}</div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">avg ${ta.powerVal}</div></div>
        <div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#7C8694;">COMBO GAME</div><div style="font-weight:800;font-size:13px;">${ta.comboLabel}</div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">avg ${ta.comboVal}</div></div>
        <div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#7C8694;">2026 TIER</div><div style="font-weight:800;font-size:13px;">${ta.tierShare}% Top 20</div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">${ta.tierShareLabel}</div></div>
        <div><div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#7C8694;">GENDER MIX</div><div style="font-weight:800;font-size:13px;">♂${ta.gM} · ⚥${ta.gX} · ♀${ta.gF}</div><div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">fighters (out of 6)</div></div>
      </div>
      <div style="margin-top:12px;padding-top:12px;border-top:1px dashed rgba(${dash},.22);font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">Most-played universe: <span style="color:#FFF;font-weight:700;">${ta.universe}</span> (${ta.universeShare} games)</div>
    </div>`;
  }

  function matchupCard(m, col) {
    const rgba = col === '#FF5246' ? '255,82,70' : col === '#1FA0E0' ? '31,160,224' : '255,255,255';
    const vCol = m.d > m.e ? '#FF5246' : m.e > m.d ? '#1FA0E0' : '#9AA3AF';
    return `<div style="background:rgba(${rgba},.04);border:1px solid rgba(${rgba},.10);border-radius:10px;padding:14px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <image-slot id="mu-d-${m.dslug}-${m.eslug}" src="characters/${m.dslug}.png" fit="contain" shape="rounded" radius="6" style="width:40px;height:40px;flex-shrink:0;background:rgba(255,82,70,.12);" placeholder="${m.dc}"></image-slot>
        <div style="flex:1;min-width:0;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#5C6470;">${m.n} GAMES</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:${vCol};margin-top:2px;">${m.verdict}</div>
        </div>
        <image-slot id="mu-e-${m.dslug}-${m.eslug}" src="characters/${m.eslug}.png" fit="contain" shape="rounded" radius="6" style="width:40px;height:40px;flex-shrink:0;background:rgba(31,160,224,.12);" placeholder="${m.ec}"></image-slot>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px;gap:6px;">
        <div style="min-width:0;flex:1;"><div style="font-weight:700;font-size:11px;line-height:1.2;word-break:break-word;">${m.dc}</div><div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#FF5246;">${m.d}W</div></div>
        <div style="min-width:0;flex:1;text-align:right;"><div style="font-weight:700;font-size:11px;line-height:1.2;word-break:break-word;">${m.ec}</div><div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#1FA0E0;">${m.e}W</div></div>
      </div>
      <div style="display:flex;height:5px;border-radius:3px;overflow:hidden;margin-top:8px;"><div style="width:${m.dShare}%;background:#FF5246;"></div><div style="flex:1;background:#1FA0E0;"></div></div>
    </div>`;
  }

  return `
<div style="max-width:1080px;margin:0 auto;padding:34px 18px 90px;">
  <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;color:#5C6470;margin-bottom:8px;">TEAM SHEET · 02</div>
  <h1 style="font-weight:900;font-size:36px;letter-spacing:-.02em;margin:0 0 8px;">Team Sheet</h1>
  <p style="color:#9AA3AF;font-size:15px;line-height:1.5;margin:0 0 28px;">A breakdown of each player's go-to team, how they play, the screams they cause, and the matchups that decide everything.</p>

  <!-- TOP 6 -->
  <div style="background:#0F1217;border-radius:14px;padding:24px;margin-bottom:14px;border:1px solid rgba(255,255,255,.05);">
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:18px;">TOP 6 CHARACTERS · BY WIN RATE (MIN 3 GAMES)</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;">
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:#FF5246;font-weight:700;margin-bottom:12px;">DEREK</div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">${dTop6.map(c => charCard(c, '#FF5246')).join('')}</div>
        ${attrsPanel(dTA, '#FF5246')}
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:#1FA0E0;font-weight:700;margin-bottom:12px;">ELLIOT</div>
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;">${eTop6.map(c => charCard(c, '#1FA0E0')).join('')}</div>
        ${attrsPanel(eTA, '#1FA0E0')}
      </div>
    </div>
  </div>

  <!-- PROFILE TOGGLE -->
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;padding:12px 18px;border-radius:10px;border:1px solid rgba(255,255,255,.05);flex-wrap:wrap;background:#07080D;">
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:#5C6470;flex-shrink:0;">SHOWING</div>
    <div style="display:flex;gap:4px;background:rgba(255,255,255,.04);padding:4px;border-radius:8px;border:1px solid rgba(255,255,255,.06);">
      ${[['top20','TOP 15 BY WIN RATE'],['all','ALL PICKS']].map(([id, label]) => `
        <div onclick="setProfileMode('${id}')" style="padding:6px 11px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:10px;letter-spacing:.08em;cursor:pointer;background:${S.profileMode===id?'rgba(255,255,255,.08)':'transparent'};color:${S.profileMode===id?'#fff':'#9AA3AF'};">${label}</div>
      `).join('')}
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#3C4450;">— filters Stat Profile · Tier Taste · Gender</div>
  </div>

  <!-- STAT PROFILE -->
  <div style="background:#0F1217;border-radius:14px;padding:24px;margin-bottom:14px;border:1px solid rgba(255,255,255,.05);">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;">STAT PROFILE</div>
      <div style="display:flex;gap:12px;font-family:'JetBrains Mono',monospace;font-size:10px;">
        <span style="display:flex;align-items:center;gap:5px;color:#FF5246;"><span style="width:10px;height:3px;background:#FF5246;border-radius:2px;display:inline-block;"></span>DEREK</span>
        <span style="display:flex;align-items:center;gap:5px;color:#1FA0E0;"><span style="width:10px;height:3px;background:#1FA0E0;border-radius:2px;display:inline-block;"></span>ELLIOT</span>
      </div>
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-bottom:20px;line-height:1.5;">${pmNote}</div>
    <div style="display:flex;flex-direction:column;gap:24px;">
      ${profileStats.map(s => `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
            <span style="font-weight:800;font-size:13px;letter-spacing:.04em;">${s.label}</span>
          </div>
          <div style="position:relative;height:16px;">
            <div style="position:absolute;left:${s.dPos}%;transform:translateX(-50%);font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;color:#FF5246;white-space:nowrap;">${s.dFmt}</div>
          </div>
          <div style="position:relative;height:20px;background:rgba(255,255,255,.04);border-radius:6px;">
            <div style="position:absolute;left:${s.dPos}%;top:0;bottom:0;width:3px;background:#FF5246;box-shadow:0 0 8px rgba(255,82,70,.6);transform:translateX(-50%);"></div>
            <div style="position:absolute;left:${s.ePos}%;top:0;bottom:0;width:3px;background:#1FA0E0;box-shadow:0 0 8px rgba(31,160,224,.6);transform:translateX(-50%);"></div>
          </div>
          <div style="position:relative;height:16px;">
            <div style="position:absolute;left:${s.ePos}%;transform:translateX(-50%);font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;color:#1FA0E0;white-space:nowrap;">${s.eFmt}</div>
          </div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#5C6470;margin-top:6px;"><span>${s.loLabel}</span><span>${s.hiLabel}</span></div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- TIER & GENDER -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:14px;">
    <div style="background:#0F1217;border-radius:14px;padding:22px;border:1px solid rgba(255,255,255,.05);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:14px;">2026 TIER TASTE · ${pmLabel}</div>
      <div style="font-size:11px;color:#9AA3AF;margin-bottom:14px;line-height:1.4;">% of picks ranked in the 2026 Top 15</div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;margin-bottom:5px;"><span style="color:#FF5246;font-weight:700;">DEREK</span><span style="color:#FF5246;font-weight:800;">${dTopTier}%</span></div>
          <div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;"><div style="width:${dTopTier}%;height:100%;background:linear-gradient(90deg,#BE221A,#FF5246);"></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:11px;margin-bottom:5px;"><span style="color:#1FA0E0;font-weight:700;">ELLIOT</span><span style="color:#1FA0E0;font-weight:800;">${eTopTier}%</span></div>
          <div style="height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;"><div style="width:${eTopTier}%;height:100%;background:linear-gradient(90deg,#0C6AAC,#1FA0E0);"></div></div>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-top:14px;line-height:1.5;">${tierNote}</div>
    </div>
    <div style="background:#0F1217;border-radius:14px;padding:22px;border:1px solid rgba(255,255,255,.05);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:14px;">GENDER OF PICKS · ${pmLabel}</div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:10px;margin-bottom:5px;"><span style="color:#FF5246;font-weight:700;">DEREK</span><span style="color:#9AA3AF;">♂${dG.M}% · ⚥${dG.X}% · ♀${dG.F}%</span></div>
          <div style="display:flex;height:18px;border-radius:4px;overflow:hidden;"><div style="width:${dG.M}%;background:#FF5246;"></div><div style="width:${dG.X}%;background:rgba(255,82,70,.55);"></div><div style="width:${dG.F}%;background:rgba(255,82,70,.28);"></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:10px;margin-bottom:5px;"><span style="color:#1FA0E0;font-weight:700;">ELLIOT</span><span style="color:#9AA3AF;">♂${eG.M}% · ⚥${eG.X}% · ♀${eG.F}%</span></div>
          <div style="display:flex;height:18px;border-radius:4px;overflow:hidden;"><div style="width:${eG.M}%;background:#1FA0E0;"></div><div style="width:${eG.X}%;background:rgba(31,160,224,.55);"></div><div style="width:${eG.F}%;background:rgba(31,160,224,.28);"></div></div>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-top:14px;line-height:1.5;">${genderNote}</div>
    </div>
  </div>

  <!-- CHARACTER UNIVERSE -->
  <div style="background:#0F1217;border-radius:14px;padding:24px;margin-bottom:14px;border:1px solid rgba(255,255,255,.05);">
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:18px;">PREFERRED CHARACTER UNIVERSE · ALL GAMES</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;">
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:#FF5246;font-weight:700;margin-bottom:12px;">DEREK</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${dUniv.map(u => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><span style="font-weight:600;font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.u}</span><span style="height:6px;background:rgba(255,82,70,.18);border-radius:3px;flex:1;max-width:100px;overflow:hidden;"><span style="display:block;height:100%;width:${u.w}%;background:#FF5246;"></span></span><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#9AA3AF;width:28px;text-align:right;">${u.n}</span></div>`).join('')}
        </div>
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:#1FA0E0;font-weight:700;margin-bottom:12px;">ELLIOT</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${eUniv.map(u => `<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;"><span style="font-weight:600;font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${u.u}</span><span style="height:6px;background:rgba(31,160,224,.18);border-radius:3px;flex:1;max-width:100px;overflow:hidden;"><span style="display:block;height:100%;width:${u.w}%;background:#1FA0E0;"></span></span><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#9AA3AF;width:28px;text-align:right;">${u.n}</span></div>`).join('')}
        </div>
      </div>
    </div>
  </div>

  <!-- RECURRING MATCHUPS -->
  ${matchups.length > 0 ? `
  <div style="background:#0F1217;border-radius:14px;padding:24px;margin-top:14px;border:1px solid rgba(255,255,255,.05);">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;flex-wrap:wrap;gap:8px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;">RECURRING MATCHUPS</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">DEREK's PICK vs ELLIOT's PICK · 2+ games</div>
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-bottom:18px;line-height:1.5;">The fights you've had more than once. Updates as new games come in.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;align-items:start;">
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#FF5246;font-weight:700;padding-bottom:6px;border-bottom:1px solid rgba(255,82,70,.2);">DEREK LEADS</div>
        ${dMatchups.map(m => matchupCard(m, '#FF5246')).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#9AA3AF;font-weight:700;padding-bottom:6px;border-bottom:1px solid rgba(255,255,255,.1);">EVEN</div>
        ${tMatchups.map(m => matchupCard(m, '#9AA3AF')).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#1FA0E0;font-weight:700;padding-bottom:6px;border-bottom:1px solid rgba(31,160,224,.2);">ELLIOT LEADS</div>
        ${eMatchups.map(m => matchupCard(m, '#1FA0E0')).join('')}
      </div>
    </div>
  </div>` : ''}

  <!-- SUDDEN DEATH -->
  ${sd.length > 0 ? `
  <div style="background:#0F1217;border-radius:14px;padding:24px;margin-top:14px;border:1px solid rgba(255,255,255,.05);position:relative;overflow:hidden;">
    <div style="position:absolute;right:-30px;top:-30px;font-size:160px;opacity:.04;font-weight:900;line-height:1;">⚡</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:6px;position:relative;">⚡ SUDDEN DEATH</div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-bottom:18px;line-height:1.5;position:relative;">Both players sat at 1 stock — winner takes all.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;position:relative;">
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#FF5246;font-weight:700;padding-bottom:6px;border-bottom:1px solid rgba(255,82,70,.2);">DEREK WINS</div>
        ${sdDerek.map((s, i) => `<div style="background:rgba(255,82,70,.04);border:1px solid rgba(255,82,70,.1);border-radius:10px;padding:14px;display:flex;align-items:center;gap:10px;">
          <image-slot id="sdd-${i}-d" src="characters/${toSlug(s.dc||'')}.png" fit="contain" shape="rounded" radius="6" style="width:48px;height:48px;flex-shrink:0;background:rgba(255,82,70,.12);" placeholder="${s.dc||''}"></image-slot>
          <div style="flex:1;min-width:0;text-align:center;"><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;">${s.dc||''} vs ${s.ec||''}</div></div>
          <image-slot id="sdd-${i}-e" src="characters/${toSlug(s.ec||'')}.png" fit="contain" shape="rounded" radius="6" style="width:48px;height:48px;flex-shrink:0;background:rgba(31,160,224,.12);" placeholder="${s.ec||''}"></image-slot>
        </div>`).join('')}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#1FA0E0;font-weight:700;padding-bottom:6px;border-bottom:1px solid rgba(31,160,224,.2);">ELLIOT WINS</div>
        ${sdElliot.map((s, i) => `<div style="background:rgba(31,160,224,.04);border:1px solid rgba(31,160,224,.1);border-radius:10px;padding:14px;display:flex;align-items:center;gap:10px;">
          <image-slot id="sde-${i}-d" src="characters/${toSlug(s.dc||'')}.png" fit="contain" shape="rounded" radius="6" style="width:48px;height:48px;flex-shrink:0;background:rgba(255,82,70,.12);" placeholder="${s.dc||''}"></image-slot>
          <div style="flex:1;min-width:0;text-align:center;"><div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;">${s.dc||''} vs ${s.ec||''}</div></div>
          <image-slot id="sde-${i}-e" src="characters/${toSlug(s.ec||'')}.png" fit="contain" shape="rounded" radius="6" style="width:48px;height:48px;flex-shrink:0;background:rgba(31,160,224,.12);" placeholder="${s.ec||''}"></image-slot>
        </div>`).join('')}
      </div>
    </div>
  </div>` : ''}
</div>`;
}
