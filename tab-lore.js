/* tab-lore.js — LORE tab render */

function renderLore() {
  const D = window.SMASH_DATA;
  if (!D) return '<div style="padding:60px;text-align:center;color:#5C6470;">Loading…</div>';

  const T = D.totals;
  const fs = D.firstStock || {};
  const shutout = D.shutout || { d:0,e:0,d51:0,e51:0 };
  const lr = D.lossRageScream || {};
  const lg = D.loudestGame || {};
  const jp = D.jigglypuffCurse || {};

  // ---- DYNAMIC PLAYER NAMES ----
  const p1Name  = (D.p1Name  || 'P1').toUpperCase();
  const p2Name  = (D.p2Name  || 'P2').toUpperCase();
  const p1Color = D.p1Color  || '#FF5246';
  const p2Color = D.p2Color  || '#1FA0E0';

  // ---- FIRST STOCK ----
  const _fsDiff = Math.abs((fs.ePct||0) - (fs.dPct||0));
  const _fsLeader = (fs.ePct||0) > (fs.dPct||0) ? p2Name : (fs.dPct||0) > (fs.ePct||0) ? p1Name : 'Both';
  const firstStockNote = fs.ePct
    ? (_fsDiff >= 5
        ? `${_fsLeader} converts first stocks into wins at a significantly higher rate (+${_fsDiff}%).`
        : 'Both players convert first stocks at a similar rate.')
    : '';

  // ---- NEAR-PERFECT / CLOSE GAMES ----
  const nearPerfectRatio = (shutout.e51||0) > 0 ? (shutout.d51 / shutout.e51).toFixed(1) : '∞';
  const cg = D.closeGames || { n:75, dW:28 };
  const cgDerekPct = cg.n > 0 ? Math.round((cg.dW / cg.n) * 100) : 0;
  const dAvgPct = T.games > 0 ? Math.round((T.dW / T.games) * 100) : 0;
  const eAvgPct = T.games > 0 ? Math.round((T.eW / T.games) * 100) : 0;
  const cgDrop = dAvgPct - cgDerekPct;

  // ---- CHARACTER ARCHETYPE HELPERS ----
  function rosterSlice(roster, slugs) {
    const rows = (roster||[]).filter(r => slugs.includes(r.slug));
    const g = rows.reduce((a,r) => a+(r.g||0), 0);
    const w = rows.reduce((a,r) => a+(r.w||0), 0);
    const l = g - w;
    const pct = g > 0 ? Math.round(w/g*100) : 0;
    return { g, w, l, pct };
  }
  function gapStr(pct, avg) {
    const d = pct - avg;
    return d >= 0 ? `+${d} pts vs avg` : `${d} pts vs avg`;
  }

  // Shirtless males: Sephiroth, Kazuya, Shulk
  const shirtlessSlugs = ['sephiroth','kazuya','shulk'];
  const shirtlessD = rosterSlice(D.dRoster, shirtlessSlugs);
  const shirtlessE = rosterSlice(D.eRoster, shirtlessSlugs);
  const shirtlessDGapStr = gapStr(shirtlessD.pct, dAvgPct);
  const shirtlessEGapStr = gapStr(shirtlessE.pct, eAvgPct);

  // Emo/dark aesthetic
  const emoSlugs = ['sephiroth','ganondorf','snake','sheik','wolf','cloud','corrin'];
  const emoD = rosterSlice(D.dRoster, emoSlugs);
  const emoE = rosterSlice(D.eRoster, emoSlugs);
  const emoDGapStr = gapStr(emoD.pct, dAvgPct);
  const emoEGapStr = gapStr(emoE.pct, eAvgPct);

  const sephRow = (D.dRoster||[]).find(r => r.slug==='sephiroth');
  const sephirothRecord = sephRow ? `${sephRow.w}–${sephRow.l}` : '—';

  // Monster squad (heavyweights)
  const monsterSlugs = ['bowser','king_k_rool','donkey_kong','king_dedede','ganondorf','incineroar'];
  const monsterE = rosterSlice(D.eRoster, monsterSlugs);
  const monsterD = rosterSlice(D.dRoster, monsterSlugs);
  const monsterEGapStr = gapStr(monsterE.pct, eAvgPct);
  const monsterSquadDetail = (D.eRoster||[])
    .filter(r => monsterSlugs.includes(r.slug) && (r.g||0) > 0)
    .sort((a,b) => (b.w||0)-(a.w||0));

  // Pokémon Trainer divide
  const ptD = (D.dRoster||[]).find(r => r.slug==='pokemon_trainer') || {g:0,w:0,l:0,pct:0};
  const ptE = (D.eRoster||[]).find(r => r.slug==='pokemon_trainer') || {g:0,w:0,l:0,pct:0};
  const ptGap = Math.abs((ptE.pct||0)-(ptD.pct||0));

  // ---- SCREAMS ----
  const totalScreams = (T.dScr||0)+(T.eScr||0);
  const sPct = totalScreams > 0;
  const screamSplit = {
    dPct: sPct ? Math.round(T.dScr/totalScreams*100) : 0,
    ePct: sPct ? Math.round(T.eScr/totalScreams*100) : 0,
    multiplier: (T.dScr||0) > 0 ? (T.eScr/T.dScr).toFixed(1) : '∞',
    eMore: (T.eScr||0)-(T.dScr||0)
  };
  const lossRageNote = lr.eLossPct != null
    ? `Loss rage: Elliot screams in ${lr.eLossPct}% of losses vs ${lr.dLossPct}% for Derek.`
    : '';
  const maxScr = Math.max(...(D.dScreams||[]).map(s=>s.v), ...(D.eScreams||[]).map(s=>s.v), 1);
  const dScreams = (D.dScreams||[]).slice(0,8).map(s => ({...s, w:Math.round(s.v/maxScr*100)}));
  const eScreams = (D.eScreams||[]).slice(0,8).map(s => ({...s, w:Math.round(s.v/maxScr*100)}));

  // ---- JIGGLYPUFF ----
  const jigglyInE = (D.eScreams||[]).find(s=>s.slug==='jigglypuff');
  const jigglyInD = (D.dScreams||[]).find(s=>s.slug==='jigglypuff');
  const jigglyScreams = (jigglyInE?.v||0)+(jigglyInD?.v||0);
  const jpShame = (D.hallOfShame||[]).filter(s=>s.dc==='Jigglypuff'||s.ec==='Jigglypuff').length;
  const jigglyNote = `Jigglypuff appears in ${jpShame} Hall of Shame incident${jpShame!==1?'s':''} and triggers combined chaos. Something about the pink puff brings out pure rage.`;

  // ---- LOUDEST GAME ----
  const lgNote = lg.screams
    ? `${Math.round(lg.screams/2)} screams each. E called Derek a f***ing bitch and D tried to slap him. Derek won.`
    : '';

  // ---- HALL OF SHAME ----
  const hallOfShame = (D.hallOfShame||[]).map(s => ({
    ...s,
    winnerCol:  s.won==='D' ? '#FF5246' : '#1FA0E0',
    winnerName: s.won==='D' ? 'DEREK' : 'ELLIOT',
    dslug: toSlug(s.dc||''),
    eslug: toSlug(s.ec||'')
  }));

  function screamRow(s, color) {
    return `<div style="display:flex;align-items:center;gap:10px;">
      <image-slot id="scr-${s.slug}" src="characters/${s.slug}.png" fit="contain" shape="rounded" radius="4" style="width:32px;height:32px;flex-shrink:0;background:rgba(255,255,255,.08);" placeholder="${s.n}"></image-slot>
      <span style="font-weight:600;font-size:12.5px;width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.n}</span>
      <span style="flex:1;height:10px;background:rgba(255,255,255,.05);border-radius:5px;overflow:hidden;"><span style="display:block;height:100%;width:${s.w}%;background:${color};"></span></span>
      <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;width:22px;text-align:right;">${s.v}</span>
    </div>`;
  }

  return `
<div style="max-width:1080px;margin:0 auto;padding:34px 18px 90px;">
  <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;color:#5C6470;margin-bottom:8px;">THE ARCHIVE · 04</div>
  <h1 style="font-weight:900;font-size:36px;letter-spacing:-.02em;margin:0 0 8px;">Lore</h1>
  <p style="color:#9AA3AF;font-size:15px;line-height:1.5;margin:0 0 28px;">The numbers behind the numbers. Advanced stats, legendary moments, and documented incidents.</p>

  <!-- ROW 1: FIRST STOCK + HIGH PEAKS / LOW VALLEYS -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:14px;">
    <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:6px;">FIRST STOCK CONVERSION</div>
      <div style="font-size:13px;color:#9AA3AF;margin-bottom:18px;line-height:1.5;">Taking the first stock wins the game <span style="color:#EDF0F3;font-weight:700;">${fs.overallPct||'—'}%</span> of the time.</div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#FF5246;font-weight:700;">DEREK</span><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#5C6470;">${fs.dTakes||0} times → ${fs.dWins||0} wins</span></div>
          <div style="background:rgba(255,255,255,.05);border-radius:6px;height:28px;overflow:hidden;position:relative;"><div style="width:${fs.dPct||0}%;height:100%;background:linear-gradient(90deg,#C5241B,#FB6256);border-radius:6px;"></div><div style="position:absolute;inset:0;display:flex;align-items:center;padding:0 10px;"><span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;color:#fff;">${fs.dPct||0}% conversion</span></div></div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#1FA0E0;font-weight:700;">ELLIOT</span><span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#5C6470;">${fs.eTakes||0} times → ${fs.eWins||0} wins</span></div>
          <div style="background:rgba(255,255,255,.05);border-radius:6px;height:28px;overflow:hidden;position:relative;"><div style="width:${fs.ePct||0}%;height:100%;background:linear-gradient(90deg,#0C6AAC,#2FA9E4);border-radius:6px;"></div><div style="position:absolute;inset:0;display:flex;align-items:center;padding:0 10px;"><span style="font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;color:#fff;">${fs.ePct||0}% conversion</span></div></div>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-top:14px;">${firstStockNote}</div>
    </div>

    <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:6px;">CONTROLLER THROWS</div>
      <div style="font-size:13px;color:#9AA3AF;margin-bottom:20px;line-height:1.5;">Who is the bigger rage quitter?</div>
      ${(D.controllerThrows && D.controllerThrows.total > 0) ? `
      <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-bottom:20px;">
        <div style="text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:${p1Color};margin-bottom:6px;">${p1Name}</div>
          <div style="font-weight:900;font-size:64px;line-height:1;color:${p1Color};letter-spacing:-.03em;">${D.controllerThrows.p1}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;margin-top:6px;">1 per ${D.controllerThrows.p1 > 0 ? Math.round(T.games / D.controllerThrows.p1) : '—'} games</div>
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#3C4450;">vs</div>
        <div style="text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:${p2Color};margin-bottom:6px;">${p2Name}</div>
          <div style="font-weight:900;font-size:64px;line-height:1;color:${p2Color};letter-spacing:-.03em;">${D.controllerThrows.p2}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;margin-top:6px;">1 per ${D.controllerThrows.p2 > 0 ? Math.round(T.games / D.controllerThrows.p2) : '—'} games</div>
        </div>
      </div>
      <div style="background:rgba(255,255,255,.03);border-radius:8px;padding:12px 16px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;line-height:1.6;">
          ${D.controllerThrows.p1 > D.controllerThrows.p2
            ? `${p1Name} is the bigger rage quitter — <span style="color:${p1Color};font-weight:800;">${D.controllerThrows.p1}</span> throws to ${p2Name}'s <span style="color:${p2Color};font-weight:800;">${D.controllerThrows.p2}</span> across ${T.games} games. Controllers are not safe around ${p1Name}.`
            : D.controllerThrows.p2 > D.controllerThrows.p1
            ? `${p2Name} is the bigger rage quitter — <span style="color:${p2Color};font-weight:800;">${D.controllerThrows.p2}</span> throws to ${p1Name}'s <span style="color:${p1Color};font-weight:800;">${D.controllerThrows.p1}</span> across ${T.games} games. Controllers are not safe around ${p2Name}.`
            : `Both players are equally guilty — <span style="font-weight:800;">${D.controllerThrows.p1}</span> throws each across ${T.games} games.`}
        </div>
      </div>` : `
      <div style="background:rgba(255,255,255,.03);border-radius:8px;padding:24px 16px;text-align:center;">
        <div style="font-size:32px;margin-bottom:10px;">🎮</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;line-height:1.7;">No controller throws logged yet.<br>Start tracking them in the Session form.</div>
      </div>`}
    </div>
  </div>

  <!-- AESTHETIC FIELD NOTES -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-bottom:14px;">

    <!-- DEREK'S TYPE -->
    <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);position:relative;overflow:hidden;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:6px;">DEREK &lt;3 SHIRTLESS EMO BOIS</div>
      <div style="font-size:13px;color:#9AA3AF;margin-bottom:18px;line-height:1.5;">He wins when his character is brooding, shirtless, or both.</div>

      <div style="background:#0F1217;border:1px solid rgba(255,82,70,.12);border-radius:10px;padding:16px;margin-bottom:10px;display:flex;align-items:center;gap:14px;">
        <image-slot id="shirtless-img" src="characters/shulk_shirtless.png" fit="contain" shape="rounded" radius="6" style="width:70px;height:70px;flex-shrink:0;filter:drop-shadow(0 3px 10px rgba(0,0,0,.6));"></image-slot>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#FF5246;margin-bottom:4px;">SHIRTLESS MALES</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#3C4450;letter-spacing:.06em;margin-bottom:8px;">SEPHIROTH · KAZUYA · SHULK</div>
          <div style="display:flex;height:5px;border-radius:3px;overflow:hidden;margin-bottom:5px;">
            <div style="width:${shirtlessD.pct}%;background:linear-gradient(90deg,#BE221A,#FF5246);"></div>
            <div style="flex:1;background:rgba(255,255,255,.06);"></div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;">${shirtlessD.w}W ${shirtlessD.l}L · ${shirtlessD.g}g · Elliot: ${shirtlessE.pct}% (${shirtlessEGapStr})</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-weight:900;font-size:38px;line-height:1;color:#FF5246;letter-spacing:-.02em;">${shirtlessD.pct}%</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#FF5246;font-weight:700;margin-top:3px;">${shirtlessDGapStr}</div>
        </div>
      </div>

      <div style="background:#0F1217;border:1px solid rgba(255,82,70,.12);border-radius:10px;padding:16px;margin-bottom:16px;display:flex;align-items:center;gap:14px;">
        <image-slot id="emo-img" src="characters/sephiroth.png" fit="contain" shape="rounded" radius="6" style="width:70px;height:70px;flex-shrink:0;filter:drop-shadow(0 3px 10px rgba(0,0,0,.6));"></image-slot>
        <div style="flex:1;min-width:0;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#FF5246;margin-bottom:4px;">EMO / DARK AESTHETIC</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#3C4450;letter-spacing:.06em;margin-bottom:8px;">SEPHIROTH · GANONDORF · SNAKE · SHEIK · WOLF + MORE</div>
          <div style="display:flex;height:5px;border-radius:3px;overflow:hidden;margin-bottom:5px;">
            <div style="width:${emoD.pct}%;background:linear-gradient(90deg,#BE221A,#FF5246);"></div>
            <div style="flex:1;background:rgba(255,255,255,.06);"></div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;">${emoD.w}W ${emoD.l}L · ${emoD.g}g · Elliot: ${emoE.pct}% (${emoEGapStr})</div>
        </div>
        <div style="text-align:right;flex-shrink:0;">
          <div style="font-weight:900;font-size:38px;line-height:1;color:#FF5246;letter-spacing:-.02em;">${emoD.pct}%</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#FF5246;font-weight:700;margin-top:3px;">${emoDGapStr}</div>
        </div>
      </div>

      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;line-height:1.7;">Both sit ${shirtlessDGapStr} and ${emoDGapStr} above Derek's average respectively. Elliot drops below his own average with shirtless characters (${shirtlessEGapStr}). Sephiroth is the apex: bare chest, silver hair, long coat, brooding villain. Derek is ${sephirothRecord} with him.</div>
    </div>

    <!-- ELLIOT'S TYPE -->
    <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);position:relative;overflow:hidden;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:6px;">ELLIOT &lt;3 BIG BOIS</div>
      <div style="font-size:13px;color:#9AA3AF;margin-bottom:14px;line-height:1.5;">Elliot likes them big. The bigger the character, the bigger the W.</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:16px;">
        <div style="font-weight:900;font-size:54px;line-height:1;color:#1FA0E0;letter-spacing:-.03em;">${monsterE.pct}%</div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#1FA0E0;font-weight:700;">${monsterEGapStr}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;">${monsterE.w}W ${monsterE.l}L · ${monsterE.g} games</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">
        ${monsterSquadDetail.map(m => `<div style="display:flex;align-items:center;gap:9px;">
          <image-slot id="ms-${m.slug}" src="characters/${m.slug}.png" fit="contain" shape="rounded" radius="4" style="width:30px;height:30px;flex-shrink:0;background:rgba(31,160,224,.10);"></image-slot>
          <span style="font-size:12px;font-weight:700;flex:1;">${m.n}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#1FA0E0;">${m.w}–${m.l}</span>
          <span style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;width:34px;text-align:right;">${m.pct}%</span>
        </div>`).join('')}
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;line-height:1.6;">Derek also does well with these characters (${monsterD.pct}%, ${monsterD.g}g) — but Elliot transforms into a different player entirely. The bigger and scarier, the better.</div>
    </div>
  </div>

  <!-- ROW 3: LOUDEST GAME + JIGGLYPUFF + POKÉMON TRAINER -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;margin-bottom:14px;">
    <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:6px;">LOUDEST GAME EVER</div>
      <div style="font-weight:900;font-size:64px;line-height:1;letter-spacing:-.03em;color:#EDF0F3;margin:12px 0 4px;">${lg.screams||'—'}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-bottom:16px;">combined screams</div>
      ${lg.dc ? `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <image-slot id="lg-dc" src="characters/${toSlug(lg.dc||'')}.png" fit="contain" shape="rounded" radius="6" style="width:36px;height:36px;flex-shrink:0;background:rgba(255,82,70,.12);" placeholder="${lg.dc}"></image-slot>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">${lg.dc} vs ${lg.ec}</div>
        <image-slot id="lg-ec" src="characters/${toSlug(lg.ec||'')}.png" fit="contain" shape="rounded" radius="6" style="width:36px;height:36px;flex-shrink:0;background:rgba(31,160,224,.12);" placeholder="${lg.ec}"></image-slot>
      </div>` : ''}
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;">${lgNote}</div>
    </div>

    <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:6px;">🩷 THE JIGGLYPUFF CURSE</div>
      <div style="font-size:13px;color:#9AA3AF;margin-bottom:16px;line-height:1.5;">Elliot has played Jigglypuff <span style="color:#EDF0F3;font-weight:700;">${jp.games||0}</span> times.</div>
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:16px;">
        <image-slot id="jp-char" src="characters/jigglypuff.png" fit="contain" shape="circle" style="width:64px;height:64px;background:rgba(255,160,180,.15);" placeholder="Jigglypuff"></image-slot>
        <div>
          <div style="font-weight:900;font-size:28px;line-height:1;color:#EDF0F3;letter-spacing:-.02em;">${jp.games||0} games played</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:rgba(255,160,180,.8);margin-top:5px;font-weight:700;">BY ELLIOT · ${jigglyScreams} COMBINED SCREAMS</div>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;">${jigglyNote}</div>
    </div>

    <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;">
        <image-slot id="pt-card" src="characters/pokemon_trainer.png" fit="contain" shape="rounded" radius="6" style="width:60px;height:60px;flex-shrink:0;background:rgba(255,255,255,.06);"></image-slot>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;">THE POKÉMON TRAINER DIVIDE</div>
          <div style="font-size:13px;color:#9AA3AF;margin-top:4px;line-height:1.4;">Same character — completely opposite results.</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div style="background:rgba(255,82,70,.08);border:2px solid rgba(255,82,70,.3);border-radius:10px;padding:14px;text-align:center;box-shadow:0 0 14px rgba(255,82,70,.1) inset;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#FF5246;margin-bottom:5px;">DEREK</div>
          <div style="font-weight:900;font-size:36px;line-height:1;color:#FF5246;letter-spacing:-.02em;">${ptD.pct||0}%</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#FF5246;margin-top:5px;">${ptD.w||0}–${ptD.l||0}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;margin-top:3px;">${ptD.g||0} games</div>
        </div>
        <div style="background:rgba(31,160,224,.06);border:1px solid rgba(31,160,224,.16);border-radius:10px;padding:14px;text-align:center;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:#1FA0E0;margin-bottom:5px;">ELLIOT</div>
          <div style="font-weight:900;font-size:36px;line-height:1;color:#1FA0E0;letter-spacing:-.02em;">${ptE.pct||0}%</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#1FA0E0;margin-top:5px;">${ptE.w||0}–${ptE.l||0}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;margin-top:3px;">${ptE.g||0} games</div>
        </div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;line-height:1.6;">Derek has played Pokémon Trainer ${ptD.g||0} times and won just ${ptD.w||0}. Elliot plays the same character at ${ptE.pct||0}% — a ${ptGap}-point gap, the largest on any shared character in ${T.games} games.</div>
    </div>
  </div>

  <!-- SCREAM INDEX -->
  <div style="background:#0F1217;border-radius:14px;padding:24px;margin-bottom:14px;border:1px solid rgba(255,255,255,.05);">
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;margin-bottom:16px;">SCREAM INDEX</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
      <div style="text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#FF5246;margin-bottom:4px;">DEREK</div>
        <div style="font-weight:900;font-size:52px;line-height:1;color:#FF5246;letter-spacing:-.03em;">${T.dScr||0}</div>
      </div>
      <div style="text-align:center;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#1FA0E0;margin-bottom:4px;">ELLIOT</div>
        <div style="font-weight:900;font-size:52px;line-height:1;color:#1FA0E0;letter-spacing:-.03em;">${T.eScr||0}</div>
      </div>
    </div>
    <div style="display:flex;height:18px;border-radius:6px;overflow:hidden;margin-bottom:8px;">
      <div style="width:${screamSplit.dPct}%;background:linear-gradient(90deg,#BE221A,#FF5246);display:flex;align-items:center;padding-left:8px;"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;color:#fff;">${screamSplit.dPct}%</span></div>
      <div style="flex:1;background:linear-gradient(90deg,#1FA0E0,#34E1FF);display:flex;align-items:center;justify-content:flex-end;padding-right:8px;"><span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;color:#fff;">${screamSplit.ePct}%</span></div>
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;line-height:1.6;margin-bottom:22px;">Elliot screams <span style="color:#1FA0E0;font-weight:800;">${screamSplit.multiplier}×</span> more — ${screamSplit.eMore} extra screams across ${T.games} games. ${lossRageNote}</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;">BY CHARACTER</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#9AA3AF;">${T.dScr||0} vs ${T.eScr||0} total</div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:24px;">
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:#FF5246;font-weight:700;margin-bottom:14px;">DEREK · screams by character</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${dScreams.map(s => screamRow(s,'#FF5246')).join('')}
        </div>
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;color:#1FA0E0;font-weight:700;margin-bottom:14px;">ELLIOT · screams by character</div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${eScreams.map(s => screamRow(s,'#1FA0E0')).join('')}
        </div>
      </div>
    </div>
  </div>

  <!-- HALL OF SHAME -->
  <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);position:relative;overflow:hidden;">
    <div style="position:absolute;right:-20px;top:-20px;font-size:140px;opacity:.03;font-weight:900;line-height:1;">💀</div>
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;flex-wrap:wrap;gap:8px;position:relative;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;">💀 HALL OF SHAME</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">${hallOfShame.length} documented incidents</div>
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-bottom:18px;line-height:1.5;position:relative;">The moments that will never be forgotten. Or forgiven.</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px;position:relative;">
      ${hallOfShame.map(s => `<div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.05);border-radius:10px;padding:14px 16px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <image-slot id="hos-d-${s.dslug}" src="characters/${s.dslug}.png" fit="contain" shape="rounded" radius="4" style="width:28px;height:28px;flex-shrink:0;background:rgba(255,82,70,.12);" placeholder="${s.dc}"></image-slot>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.dc} vs ${s.ec}</div>
          <image-slot id="hos-e-${s.eslug}" src="characters/${s.eslug}.png" fit="contain" shape="rounded" radius="4" style="width:28px;height:28px;flex-shrink:0;background:rgba(31,160,224,.12);" placeholder="${s.ec}"></image-slot>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:800;color:${s.winnerCol};flex-shrink:0;">${s.winnerName} W</div>
        </div>
        <div style="font-size:12px;line-height:1.5;color:#C8CDD4;font-style:italic;">"${s.note}"</div>
      </div>`).join('')}
    </div>
  </div>
</div>`;
}
