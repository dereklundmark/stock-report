/* tab-battlegrounds.js — BATTLEGROUNDS tab render */

function renderBattlegrounds() {
  const D = window.SMASH_DATA;
  if (!D) return '<div style="padding:60px;text-align:center;color:#5C6470;">Loading…</div>';

  const v = D.venue;
  const p1Name = D.p1Name || 'P1';
  const p2Name = D.p2Name || 'P2';
  const P1 = p1Name.toUpperCase();
  const P2 = p2Name.toUpperCase();
  const ipD = Math.round(100 * v.person.d / v.person.n);
  const onD = Math.round(100 * v.online.d / v.online.n);
  const venues = [
    { label:'IN-PERSON', n:v.person.n, d:v.person.d, e:v.person.e, dPct:ipD, ePct:100-ipD, note:`On the couch, ${p2Name}'s edge grows.` },
    { label:'ONLINE',    n:v.online.n, d:v.online.d, e:v.online.e, dPct:onD, ePct:100-onD, note:'Over the wire it tightens up.' }
  ];

  const pl = D.platforms;
  const platCards = [
    { label:'PLATFORMS ON',  n:pl.on.n,  d:pl.on.d,  e:pl.on.e,  dPct:pl.on.dPct,  ePct:100-pl.on.dPct,  note:`${p1Name} closes the gap with platforms.` },
    { label:'PLATFORMS OFF', n:pl.off.n, d:pl.off.d, e:pl.off.e, dPct:pl.off.dPct, ePct:100-pl.off.dPct, note:`Flat stages suit ${p2Name}'s playstyle.` }
  ];

  const dow = D.dayOfWeek || [];
  let dowNote = '';
  if (dow.length) {
    const best  = dow.reduce((a, b) => b.dPct > a.dPct ? b : a);
    const worst = dow.reduce((a, b) => b.dPct < a.dPct ? b : a);
    dowNote = `${best.day} is ${p1Name}'s best day (${best.dPct}%). ${worst.day} is ${p1Name}'s worst (${worst.dPct}%). ${worst.day} is ${p2Name}'s stronghold (${100 - worst.dPct}%).`;
  }
  const dayOfWeek = dow.map(d => ({ ...d, ePct: 100 - d.dPct }));

  const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const maxM = Math.max(...D.monthly.map(m => m.d + m.e), 1);
  const monthly = D.monthly.map(m => {
    const [yy, mm] = m.m.split('-');
    const isOnline = m.venue === 'online';
    return {
      label: MN[+mm - 1] + " '" + yy.slice(2),
      d: m.d, e: m.e,
      dh: Math.max(2, Math.round(m.d / maxM * 130)),
      eh: Math.max(2, Math.round(m.e / maxM * 130)),
      venueLabel: isOnline ? 'ONLINE' : 'IN-PERSON',
      venueDot:   isOnline ? '#4B9FD4' : '#C8A44A',
      venueBg:    isOnline ? 'rgba(31,160,224,.06)' : 'rgba(200,164,74,.07)'
    };
  });

  const form = (D.form || []).map(f => ({ c: f ? '#FF5246' : '#1FA0E0', h: f ? 60 : 44 }));

  function venueCard(v) {
    return `<div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px;">
        <span style="font-weight:900;font-size:18px;">${v.label}</span>
        <span style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#5C6470;">${v.n} GAMES</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:800;margin-bottom:8px;">
        <span style="color:#FF5246;">${P1[0]} ${v.dPct}%</span>
        <span style="color:#1FA0E0;">${v.ePct}% ${P2[0]}</span>
      </div>
      <div style="display:flex;height:30px;border-radius:6px;overflow:hidden;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#fff;">
        <div style="width:${v.dPct}%;background:linear-gradient(90deg,#BE221A,#FF5246);display:flex;align-items:center;padding-left:10px;">${v.d}W</div>
        <div style="flex:1;background:linear-gradient(90deg,#1FA0E0,#34E1FF);display:flex;align-items:center;justify-content:flex-end;padding-right:10px;">${v.e}W</div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-top:12px;line-height:1.5;">${v.note}</div>
    </div>`;
  }

  return `
<div style="max-width:1080px;margin:0 auto;padding:34px 18px 90px;">
  <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;color:#5C6470;margin-bottom:8px;">BATTLEGROUNDS · 03</div>
  <h1 style="font-weight:900;font-size:36px;letter-spacing:-.02em;margin:0 0 8px;">Battlegrounds</h1>
  <p style="color:#9AA3AF;font-size:15px;line-height:1.5;margin:0 0 28px;">Where and when the war is fought — venue, stage settings, and monthly form.</p>

  <!-- VENUE CARDS -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:14px;">
    ${venues.map(venueCard).join('')}
  </div>

  <!-- PLATFORM CARDS -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:14px;">
    ${platCards.map(v => `<div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:18px;">
        <div style="font-weight:900;font-size:17px;letter-spacing:.04em;">${v.label}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#5C6470;">${v.n} GAMES</div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:10px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#FF5246;font-weight:700;">${P1[0]} ${v.dPct}%</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#1FA0E0;font-weight:700;">${v.ePct}% ${P2[0]}</div>
      </div>
      <div style="display:flex;border-radius:6px;overflow:hidden;height:32px;">
        <div style="width:${v.dPct}%;background:linear-gradient(90deg,#C5241B,#FB6256);display:flex;align-items:center;padding-left:10px;"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#fff;white-space:nowrap;">${v.d}W</span></div>
        <div style="flex:1;background:linear-gradient(90deg,#0C6AAC,#2FA9E4);display:flex;align-items:center;justify-content:flex-end;padding-right:10px;"><span style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:800;color:#fff;white-space:nowrap;">${v.e}W</span></div>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-top:14px;">${v.note}</div>
    </div>`).join('')}
  </div>

  <!-- DAY OF WEEK -->
  <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;">DAY OF WEEK</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">win % by day</div>
    </div>
    <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-bottom:18px;">${dowNote}</div>
    <div style="display:grid;grid-template-columns:40px 1fr;gap:12px;margin-bottom:6px;">
      <div></div>
      <div style="display:flex;justify-content:space-between;padding:0 2px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#FF5246;font-weight:700;">${P1}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;font-weight:700;">50%</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#1FA0E0;font-weight:700;">${P2}</div>
      </div>
    </div>
    <div style="display:flex;flex-direction:column;gap:8px;">
      ${dayOfWeek.map(d => `<div style="display:grid;grid-template-columns:40px 1fr;align-items:center;gap:12px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#9AA3AF;">${d.day}</div>
        <div style="display:flex;flex-direction:column;gap:3px;">
          <div style="display:flex;border-radius:5px;overflow:hidden;height:26px;position:relative;">
            <div style="width:${d.dPct}%;background:linear-gradient(90deg,#C5241B,#FB6256);display:flex;align-items:center;padding-left:6px;flex-shrink:0;min-width:32px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;color:#fff;">${d.dPct}%</span>
            </div>
            <div style="flex:1;background:linear-gradient(90deg,#0C6AAC,#2FA9E4);display:flex;align-items:center;justify-content:flex-end;padding-right:6px;min-width:32px;">
              <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;color:#fff;">${d.ePct}%</span>
            </div>
            <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(7,8,13,.5);"></div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#3C4450;">${d.n} games</div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- WINS BY MONTH -->
  <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);margin-bottom:14px;">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:22px;flex-wrap:wrap;gap:10px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;">WINS BY MONTH</div>
      <div style="display:flex;gap:14px;font-family:'JetBrains Mono',monospace;font-size:10px;flex-wrap:wrap;">
        <span style="color:#FF5246;">${`■ ${P1}`}</span>
        <span style="color:#1FA0E0;">${`■ ${P2}`}</span>
        <span style="color:#4B9FD4;opacity:.7;">— ONLINE</span>
        <span style="color:#C8A44A;opacity:.7;">— IN-PERSON</span>
      </div>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -4px;padding:0 4px;">
      <div style="display:grid;grid-template-columns:repeat(${monthly.length},minmax(48px,1fr));gap:8px;align-items:end;min-width:480px;padding-bottom:40px;">
        ${monthly.map(m => `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="display:flex;gap:3px;align-items:flex-end;height:140px;background:${m.venueBg};border-radius:4px;padding:0 3px;">
            <div style="width:11px;height:${m.dh}px;background:linear-gradient(#FB6256,#C5241B);border-radius:2px 2px 0 0;"></div>
            <div style="width:11px;height:${m.eh}px;background:linear-gradient(#2FA9E4,#0C6AAC);border-radius:2px 2px 0 0;"></div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;white-space:nowrap;transform:rotate(-30deg);transform-origin:center;margin-top:4px;">${m.label}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:7px;color:${m.venueDot};white-space:nowrap;transform:rotate(-30deg);transform-origin:center;margin-top:10px;letter-spacing:.05em;">${m.venueLabel}</div>
        </div>`).join('')}
      </div>
    </div>
  </div>

  <!-- LAST 20 GAMES FORM STRIP -->
  <div style="background:#0F1217;border-radius:14px;padding:24px;border:1px solid rgba(255,255,255,.05);">
    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:14px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.18em;color:#5C6470;">LAST 20 GAMES</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#9AA3AF;">most recent on the right</div>
    </div>
    <div style="display:flex;gap:4px;align-items:flex-end;height:60px;">
      ${form.map(f => `<span style="flex:1;height:${f.h}px;border-radius:2px;background:${f.c};display:block;"></span>`).join('')}
    </div>
  </div>
</div>`;
}
