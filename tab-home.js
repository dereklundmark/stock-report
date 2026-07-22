/* tab-home.js — HOME tab render */

function renderHome() {
  const D = window.SMASH_DATA;
  if (!D) return '<div style="padding:60px;text-align:center;color:#5C6470;">Loading…</div>';
  const T = D.totals;
  const p1Name = D.p1Name || 'P1';
  const p2Name = D.p2Name || 'P2';
  const p1Color = D.p1Color || '#FF5246';
  const p2Color = D.p2Color || '#1FA0E0';
  const P1 = p1Name.toUpperCase();
  const P2 = p2Name.toUpperCase();
  const dRanked = rankWinrate(D.dRoster);
  const eRanked = rankWinrate(D.eRoster);
  const dMain = dRanked[0] || {};
  const eMain = eRanked[0] || {};
  const dSlug = dMain.n ? toSlug(dMain.n) : '';
  const eSlug = eMain.n ? toSlug(eMain.n) : '';
  const dPortrait = makePortrait(
    dSlug ? `characters/${dSlug}.png` : '',
    dSlug ? `icons/${dSlug}.svg` : '',
    'sepia(1) saturate(3) hue-rotate(320deg)'
  );
  const ePortrait = makePortrait(
    eSlug ? `characters/${eSlug}.png` : '',
    eSlug ? `icons/${eSlug}.svg` : '',
    'sepia(1) saturate(3) hue-rotate(180deg)'
  );
  const dPct = T.games ? Math.round(T.dW / T.games * 1000) / 10 : 0;
  const ePct = T.games ? Math.round(T.eW / T.games * 1000) / 10 : 0;
  const leadAbs = Math.abs(T.dW - T.eW);
  const leaderName = T.eW > T.dW ? P2 : T.dW > T.eW ? P1 : null;
  const leadText = leaderName ? `${leaderName} LEADS · +${leadAbs} WINS` : 'TIED';

  return `
<div style="position:relative;min-height:calc(100vh - 56px);background:radial-gradient(120% 90% at 8% 0%,rgba(190,34,26,.30),transparent 55%),radial-gradient(120% 90% at 92% 100%,rgba(10,90,151,.34),transparent 55%);display:flex;align-items:center;justify-content:center;padding:32px 16px;">
  <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;overflow:hidden;">
    <span style="font-weight:900;font-style:italic;font-size:46vh;color:rgba(255,255,255,.018);letter-spacing:-.04em;user-select:none;">VS</span>
  </div>
  <div style="position:relative;z-index:1;width:100%;max-width:1080px;">
    <div style="background:#0F1217;border-radius:30px;overflow:hidden;box-shadow:0 30px 70px rgba(0,0,0,.55);color:#fff;">

      <!-- P1 -->
      <div style="position:relative;background:linear-gradient(125deg,#FB6256 0%,#E5342B 48%,#C5241B 100%);overflow:hidden;">
        <div style="padding:24px 26px;display:flex;align-items:center;justify-content:space-between;gap:14px;">
          <div style="display:flex;flex-direction:column;min-width:0;flex:1;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.24em;font-weight:700;text-shadow:0 2px 6px rgba(0,0,0,.3);">${P1}</div>
            <div style="font-weight:900;font-size:clamp(110px,19vw,280px);line-height:.78;letter-spacing:-.05em;text-shadow:0 6px 22px rgba(0,0,0,.38);margin-top:4px;">${T.dW}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.06em;opacity:.75;margin-top:14px;text-shadow:0 2px 6px rgba(0,0,0,.3);">${dPct}% WIN RATE</div>
          </div>
          <div style="flex-shrink:0;width:min(280px,42vw);height:min(280px,42vw);">${dPortrait}</div>
        </div>
      </div>

      <!-- VS BADGE -->
      <div style="position:relative;height:0;z-index:5;">
        <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:68px;height:68px;border-radius:50%;background:#0F1217;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 5px #0F1217,0 0 0 7px rgba(255,255,255,.9);">
          <span style="font-weight:900;font-style:italic;font-size:25px;">VS</span>
        </div>
      </div>

      <!-- P2 -->
      <div style="position:relative;background:linear-gradient(305deg,#2FA9E4 0%,#1488C8 48%,#0C6AAC 100%);overflow:hidden;">
        <div style="padding:24px 26px;display:flex;flex-direction:row-reverse;align-items:center;justify-content:space-between;gap:14px;">
          <div style="display:flex;flex-direction:column;align-items:flex-end;text-align:right;min-width:0;flex:1;">
            <div style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.24em;font-weight:700;text-shadow:0 2px 6px rgba(0,0,0,.3);">${P2}</div>
            <div style="font-weight:900;font-size:clamp(110px,19vw,280px);line-height:.78;letter-spacing:-.05em;text-shadow:0 6px 22px rgba(0,0,0,.38);margin-top:4px;">${T.eW}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:13px;letter-spacing:.06em;opacity:.75;margin-top:14px;text-shadow:0 2px 6px rgba(0,0,0,.3);">${ePct}% WIN RATE</div>
          </div>
          <div style="flex-shrink:0;width:min(280px,42vw);height:min(280px,42vw);">${ePortrait}</div>
        </div>
      </div>

      <!-- WIN SHARE BAR -->
      <div style="padding:22px 24px 20px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:9px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;">
          <span style="color:#FF5246;">${P1} ${dPct}%</span>
          <span style="color:#1FA0E0;">${ePct}% ${P2}</span>
        </div>
        <div style="display:flex;height:18px;border-radius:9px;overflow:hidden;box-shadow:0 0 20px rgba(31,160,224,.28);">
          <div style="width:${dPct}%;background:linear-gradient(90deg,#BE221A,#FF5246);"></div>
          <div style="flex:1;background:linear-gradient(90deg,#1FA0E0,#34E1FF);"></div>
        </div>
        <div style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;font-weight:800;color:#1FA0E0;margin-top:12px;">${leadText} · ${T.games} GAMES LOGGED</div>
      </div>

      <!-- TALE OF THE TAPE -->
      <div style="padding:4px 24px 24px;">
        <div style="display:flex;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;color:#5C6470;margin-bottom:15px;">— TALE OF THE TAPE —</div>
        <div style="display:flex;flex-direction:column;gap:13px;">
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;">
            <span style="font-weight:900;font-size:18px;color:#FF5246;text-align:right;">${T.streak.d}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#7C8694;text-align:center;">MOST WINS IN A ROW</span>
            <span style="font-weight:900;font-size:18px;color:#1FA0E0;">${T.streak.e}</span>
          </div>
          <div style="height:1px;background:rgba(255,255,255,.07);"></div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;">
            <span style="font-weight:900;font-size:18px;color:#FF5246;text-align:right;">${T.nights.d}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#7C8694;text-align:center;">GAME NIGHTS WON · ${T.nights.total}</span>
            <span style="font-weight:900;font-size:18px;color:#1FA0E0;">${T.nights.e}</span>
          </div>
          <div style="height:1px;background:rgba(255,255,255,.07);"></div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;">
            <span style="font-weight:900;font-size:18px;color:#FF5246;text-align:right;">${T.dKills}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#7C8694;text-align:center;">TOTAL KO'S</span>
            <span style="font-weight:900;font-size:18px;color:#1FA0E0;">${T.eKills}</span>
          </div>
          <div style="height:1px;background:rgba(255,255,255,.07);"></div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px;">
            <span style="font-weight:900;font-size:18px;color:#FF5246;text-align:right;">${T.dScr}</span>
            <span style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.1em;color:#7C8694;text-align:center;">SCREAMS</span>
            <span style="font-weight:900;font-size:18px;color:#1FA0E0;">${T.eScr}</span>
          </div>
        </div>
      </div>

      <!-- DIVE DEEPER -->
      <div onclick="diveDeeper()" style="border-top:1px solid rgba(255,255,255,.07);padding:16px 24px 20px;display:flex;align-items:center;justify-content:center;gap:9px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.14em;font-weight:700;color:#8A93A3;">
        <span>DIVE DEEPER INTO THE STATS</span><span style="font-size:14px;">▾</span>
      </div>
    </div>
    <div style="text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:#3F4654;margin-top:14px;">${T.span}</div>
  </div>
</div>`;
}
