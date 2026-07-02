/* tab-session.js — SESSION OVERLAY render */

// Global character list used by pickChar() in app-core.js
window._sessionChars = [];

function renderSession() {
  const D = window.SMASH_DATA;
  if (!D) return '';

  const T = D.totals;
  const cm = S.currentMatch;

  // Build character list (alphabetical, unplayed last)
  const gamesPlayed = {};
  for (const c of [...(D.dRoster||[]), ...(D.eRoster||[])]) {
    gamesPlayed[c.n] = (gamesPlayed[c.n] || 0) + c.g;
  }
  const chars = (D.masterChars || Object.keys(gamesPlayed))
    .map(n => ({ n, slug: toSlug(n), g: gamesPlayed[n] || 0 }))
    .sort((a, b) => a.n.localeCompare(b.n));

  // Expose globally so pickChar() can look up by index
  window._sessionChars = chars;

  const sessionDW = S.sessionMatches.filter(m => m.outcome === 'D').length;
  const sessionEW = S.sessionMatches.filter(m => m.outcome === 'E').length;

  const activeDash = S.dashboards.find(d => d.id === S.activeDashboard) || S.dashboards[0] || {};
  const activeDashName = activeDash.name || 'Game Night';
  const p1Name = (activeDash.p1 || 'Derek').toUpperCase();
  const p2Name = (activeDash.p2 || 'Elliot').toUpperCase();

  const isLogin   = S.sessionScreen === 'login';
  const isSelect  = S.sessionScreen === 'select';
  const isCreate  = S.sessionScreen === 'create';
  const isSession = S.sessionScreen === 'session';

  const isPickingD = isSession && S.sessionStep <= 1;
  const isPickingE = isSession && S.sessionStep === 2;
  const isStats    = isSession && S.sessionStep >= 3;

  /* ─ HEADER ─ */
  const headerTitle = isLogin ? 'SIGN IN'
    : isSelect ? 'MY DASHBOARDS'
    : isCreate ? '<span onclick="goBackToSelect()" style="font-family:\'JetBrains Mono\',monospace;font-size:10px;color:#5C6470;cursor:pointer;">← BACK</span> &nbsp;NEW RIVALRY'
    : 'GAME NIGHT';

  const headerRight = `
    ${isSession ? `<div onclick="clearSession()" style="padding:7px 12px;border-radius:7px;border:1px solid rgba(255,255,255,.08);font-family:'JetBrains Mono',monospace;font-size:10px;cursor:pointer;color:#5C6470;">CLEAR</div>` : ''}
    ${S.isLoggedIn ? `<div onclick="logout()" style="padding:5px 10px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:9px;color:#5C6470;cursor:pointer;border:1px solid rgba(255,255,255,.07);">LOG OUT</div>` : ''}
    <div onclick="closeSession()" style="padding:7px 14px;border-radius:7px;background:rgba(255,255,255,.07);font-family:'JetBrains Mono',monospace;font-weight:700;font-size:11px;cursor:pointer;">✕</div>`;

  const sessionScoreBadge = isSession
    ? `<div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;background:rgba(255,255,255,.05);padding:3px 10px;border-radius:20px;margin-left:8px;"><span style="color:#FF5246;font-weight:700;">${sessionDW}W</span> – <span style="color:#1FA0E0;font-weight:700;">${sessionEW}W</span></div>`
    : '';

  /* ─ LOGIN SCREEN ─ */
  const loginHtml = isLogin ? `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;">
      <div style="width:100%;max-width:360px;">
        <div style="text-align:center;margin-bottom:36px;">
          <div style="font-weight:900;font-size:28px;letter-spacing:-.02em;margin-bottom:4px;"><span style="color:#FF5246;letter-spacing:.04em;">STOCK</span> <span style="color:#5C6470;font-size:18px;font-weight:700;">✦</span> <span style="color:#1FA0E0;letter-spacing:.04em;">REPORT</span></div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;color:#5C6470;">SIGN IN TO LOG A MATCH</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;color:#5C6470;margin-bottom:6px;">EMAIL</div>
            <input id="login-email" type="email" value="${S.loginEmail}" oninput="setLoginEmail(this.value)" placeholder="you@email.com" autocomplete="email" style="width:100%;padding:14px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-size:15px;outline:none;font-family:'Archivo',sans-serif;box-sizing:border-box;">
          </div>
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;color:#5C6470;margin-bottom:6px;">PASSWORD</div>
            <input id="login-password" type="password" value="${S.loginPassword}" oninput="setLoginPassword(this.value)" onkeydown="if(event.key==='Enter')submitLogin()" placeholder="••••••••" autocomplete="current-password" style="width:100%;padding:14px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-size:15px;outline:none;font-family:'Archivo',sans-serif;box-sizing:border-box;">
          </div>
          ${S.loginError ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#FB6256;padding:10px 14px;border-radius:8px;background:rgba(255,82,70,.08);border:1px solid rgba(255,82,70,.2);">${S.loginError}</div>` : ''}
          <div onclick="submitLogin()" style="padding:16px;border-radius:10px;background:linear-gradient(135deg,#C5241B,#0C6AAC);text-align:center;cursor:pointer;font-weight:900;font-size:14px;letter-spacing:.06em;margin-top:4px;">${S.loginLoading ? 'ENTERING…' : 'ENTER'}</div>
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#3C4450;text-align:center;line-height:1.6;">Access is by invite only.<br>Contact the dashboard owner to request access.</div>
      </div>
    </div>` : '';

  /* ─ DASHBOARD SELECTOR ─ */
  const selectHtml = isSelect ? `
    <div style="flex:1;overflow-y:auto;padding:24px;max-width:600px;width:100%;margin:0 auto;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:#5C6470;">SELECT A RIVALRY TO LOG MATCHES</div>
        ${S.isAdmin ? `<div style="font-family:'JetBrains Mono',monospace;font-size:9px;font-weight:800;letter-spacing:.12em;padding:3px 8px;border-radius:4px;background:linear-gradient(135deg,rgba(197,36,27,.3),rgba(12,106,172,.3));border:1px solid rgba(255,255,255,.15);color:#EDF0F3;">⚡ ADMIN</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        ${S.dashboards.map(d => `<div onclick="selectDashboard('${d.id}')" style="display:flex;align-items:center;gap:14px;padding:16px 18px;background:#0F1217;border-radius:12px;border:1px solid rgba(255,255,255,.07);cursor:pointer;">
          <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;">
            <div style="width:28px;height:12px;border-radius:3px;background:${d.p1c};"></div>
            <div style="width:28px;height:12px;border-radius:3px;background:${d.p2c};"></div>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:800;font-size:15px;letter-spacing:-.01em;">${d.name}</div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;margin-top:3px;">${d.games} games logged</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:18px;color:#3C4450;">›</div>
        </div>`).join('')}
      </div>
      <div onclick="goCreateDashboard()" style="display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;border-radius:12px;border:1px dashed rgba(255,255,255,.12);cursor:pointer;background:rgba(255,255,255,.02);">
        <div style="width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#C5241B,#0C6AAC);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:900;flex-shrink:0;">+</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:.1em;">START NEW RIVALRY</div>
      </div>
    </div>` : '';

  /* ─ CREATE RIVALRY ─ */
  const createHtml = isCreate ? `
    <div style="flex:1;overflow-y:auto;padding:24px;max-width:600px;width:100%;margin:0 auto;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:#5C6470;margin-bottom:20px;">SET UP YOUR RIVALRY</div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div style="background:#0F1217;border-radius:12px;padding:18px;border:1px solid rgba(255,82,70,.2);">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:#FF5246;font-weight:700;margin-bottom:12px;">PLAYER 1</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
            <input id="create-p1" type="text" value="${S.createP1}" oninput="setCreateP1(this.value)" placeholder="Enter name…" style="padding:12px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-size:14px;font-weight:700;outline:none;font-family:'Archivo',sans-serif;">
            <div style="display:flex;gap:6px;">
              ${['#FF5246','#E87722','#9B59B6'].map(c => `<div onclick="setCreateP1Color('${c}')" style="width:28px;height:28px;border-radius:6px;background:${c};cursor:pointer;border:2px solid ${S.createP1Color===c?'#fff':'transparent'};"></div>`).join('')}
            </div>
          </div>
        </div>
        <div style="text-align:center;font-family:'JetBrains Mono',monospace;font-weight:900;font-size:14px;color:#3C4450;letter-spacing:.2em;">VS</div>
        <div style="background:#0F1217;border-radius:12px;padding:18px;border:1px solid rgba(31,160,224,.2);">
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:#1FA0E0;font-weight:700;margin-bottom:12px;">PLAYER 2</div>
          <div style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
            <input id="create-p2" type="text" value="${S.createP2}" oninput="setCreateP2(this.value)" placeholder="Enter name…" style="padding:12px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-size:14px;font-weight:700;outline:none;font-family:'Archivo',sans-serif;">
            <div style="display:flex;gap:6px;">
              ${['#1FA0E0','#27AE60','#F1C40F'].map(c => `<div onclick="setCreateP2Color('${c}')" style="width:28px;height:28px;border-radius:6px;background:${c};cursor:pointer;border:2px solid ${S.createP2Color===c?'#fff':'transparent'};"></div>`).join('')}
            </div>
          </div>
        </div>
        <div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;color:#5C6470;margin-bottom:6px;">INVITE PLAYER 2 BY EMAIL <span style="color:#3C4450;">(optional)</span></div>
          <input id="create-invite-email" type="email" value="${S.createInviteEmail}" oninput="setCreateInviteEmail(this.value)" placeholder="friend@email.com" style="width:100%;padding:12px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-size:14px;outline:none;font-family:'Archivo',sans-serif;box-sizing:border-box;">
        </div>
        ${S.createError ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#FB6256;padding:10px 14px;border-radius:8px;background:rgba(255,82,70,.08);">${S.createError}</div>` : ''}
        <div onclick="submitCreateDashboard()" style="padding:16px;border-radius:10px;background:linear-gradient(135deg,#C5241B,#0C6AAC);text-align:center;cursor:pointer;font-weight:900;font-size:14px;letter-spacing:.06em;">CREATE RIVALRY</div>
      </div>
    </div>` : '';

  /* ─ SESSION BODY ─ */
  const charGrid = chars.map((c, i) => `
    <div onclick="pickChar(${i})" style="display:flex;flex-direction:column;align-items:center;gap:5px;padding:8px 4px;border-radius:8px;cursor:pointer;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);">
      <image-slot id="sp-${c.slug}" src="characters/${c.slug}.png" fit="contain" shape="rounded" radius="4" style="width:44px;height:44px;background:rgba(255,255,255,.07);"></image-slot>
      <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#9AA3AF;text-align:center;line-height:1.2;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.n}</div>
    </div>`).join('');

  const dWinBg = cm.outcome === 'D' ? 'rgba(255,82,70,.3)' : 'rgba(255,82,70,.1)';
  const eWinBg = cm.outcome === 'E' ? 'rgba(31,160,224,.3)' : 'rgba(31,160,224,.1)';
  const dWinBorder = cm.outcome === 'D' ? '2px solid #FF5246' : '2px solid rgba(255,82,70,.2)';
  const eWinBorder = cm.outcome === 'E' ? '2px solid #1FA0E0' : '2px solid rgba(31,160,224,.2)';
  const fhDActive = cm.fh === 'D' ? '#FF5246' : 'rgba(255,255,255,.06)';
  const fhEActive = cm.fh === 'E' ? '#1FA0E0' : 'rgba(255,255,255,.06)';
  const fsDActive = cm.fs === 'D' ? '#FF5246' : 'rgba(255,255,255,.06)';
  const fsEActive = cm.fs === 'E' ? '#1FA0E0' : 'rgba(255,255,255,.06)';
  const onlineBg = S.sessionVenue === 'online' ? 'rgba(75,159,212,.2)' : 'transparent';
  const onlineCol = S.sessionVenue === 'online' ? '#4B9FD4' : '#5C6470';
  const personBg = S.sessionVenue !== 'online' ? 'rgba(200,164,74,.2)' : 'transparent';
  const personCol = S.sessionVenue !== 'online' ? '#C8A44A' : '#5C6470';

  const sessionHtml = isSession ? `
    <!-- VENUE STRIP -->
    <div style="display:flex;align-items:center;gap:10px;padding:10px 20px;border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;background:#0A0B10;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#5C6470;">VENUE</div>
      <div style="display:flex;gap:3px;background:rgba(255,255,255,.04);padding:3px;border-radius:7px;">
        <div onclick="setOnline()" style="padding:5px 12px;border-radius:5px;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:10px;cursor:pointer;background:${onlineBg};color:${onlineCol};">ONLINE</div>
        <div onclick="setInPerson()" style="padding:5px 12px;border-radius:5px;font-family:'JetBrains Mono',monospace;font-weight:700;font-size:10px;cursor:pointer;background:${personBg};color:${personCol};">IN-PERSON</div>
      </div>
      <div style="flex:1;text-align:right;font-family:'JetBrains Mono',monospace;font-size:9px;color:#3C4450;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${activeDashName}</div>
    </div>

    <!-- SESSION BODY -->
    <div style="flex:1;overflow-y:auto;padding:20px;max-width:600px;width:100%;margin:0 auto;">

      ${isPickingD ? `
      <div style="margin-bottom:20px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:#FF5246;font-weight:700;margin-bottom:14px;">PICK ${p1Name}'S CHARACTER</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px;">${charGrid}</div>
      </div>` : ''}

      ${isPickingE ? `
      <div style="margin-bottom:20px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;">
          <image-slot id="picked-d" src="characters/${cm.dcSlug||'_'}.png" fit="contain" shape="rounded" radius="4" style="width:32px;height:32px;background:rgba(255,82,70,.12);" placeholder="${cm.dc}"></image-slot>
          <div style="font-size:12px;font-weight:700;color:#FF5246;">${cm.dc}</div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;flex:1;">selected · now pick ${p2Name}'s</div>
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;color:#1FA0E0;font-weight:700;margin-bottom:14px;">PICK ${p2Name}'S CHARACTER</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(76px,1fr));gap:8px;">${charGrid}</div>
      </div>` : ''}

      ${isStats ? `
      <div style="background:#0F1217;border-radius:14px;padding:20px;margin-bottom:20px;border:1px solid rgba(255,255,255,.07);">
        <!-- MATCHUP HEADER -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,.06);">
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">
            <image-slot id="sf-dc" src="characters/${cm.dcSlug||'_'}.png" fit="contain" shape="rounded" radius="6" style="width:52px;height:52px;background:rgba(255,82,70,.12);" placeholder="${cm.dc}"></image-slot>
            <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#FF5246;font-weight:700;">${p1Name}</div>
            <div style="font-size:11px;font-weight:700;text-align:center;color:#EDF0F3;">${cm.dc}</div>
          </div>
          <div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#3C4450;font-weight:900;">VS</div>
          <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;">
            <image-slot id="sf-ec" src="characters/${cm.ecSlug||'_'}.png" fit="contain" shape="rounded" radius="6" style="width:52px;height:52px;background:rgba(31,160,224,.12);" placeholder="${cm.ec}"></image-slot>
            <div style="font-family:'JetBrains Mono',monospace;font-size:8px;color:#1FA0E0;font-weight:700;">${p2Name}</div>
            <div style="font-size:11px;font-weight:700;text-align:center;color:#EDF0F3;">${cm.ec}</div>
          </div>
        </div>

        <!-- WHO WON -->
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#5C6470;margin-bottom:8px;">WHO WON?</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px;">
          <div onclick="setDerekWin()" style="padding:14px;border-radius:10px;background:${dWinBg};border:${dWinBorder};text-align:center;cursor:pointer;font-weight:900;font-size:16px;color:#FF5246;letter-spacing:.04em;">${p1Name}</div>
          <div onclick="setElliotWin()" style="padding:14px;border-radius:10px;background:${eWinBg};border:${eWinBorder};text-align:center;cursor:pointer;font-weight:900;font-size:16px;color:#1FA0E0;letter-spacing:.04em;">${p2Name}</div>
        </div>

        <!-- KILLS -->
        <div style="margin-bottom:16px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#5C6470;margin-bottom:10px;">KILLS</div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:8px;height:8px;border-radius:50%;background:#FF5246;flex-shrink:0;"></div>
              <div onclick="dKillMinus()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:700;color:#EDF0F3;">−</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:900;width:28px;text-align:center;">${cm.dKills||0}</div>
              <div onclick="dKillPlus()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:700;color:#EDF0F3;">+</div>
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#3C4450;">|</div>
            <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">
              <div onclick="eKillMinus()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:700;color:#EDF0F3;">−</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:900;width:28px;text-align:center;">${cm.eKills||0}</div>
              <div onclick="eKillPlus()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:700;color:#EDF0F3;">+</div>
              <div style="width:8px;height:8px;border-radius:50%;background:#1FA0E0;flex-shrink:0;"></div>
            </div>
          </div>
        </div>

        <!-- SCREAMS -->
        <div style="margin-bottom:16px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.14em;color:#5C6470;margin-bottom:10px;">SCREAMS</div>
          <div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:8px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:8px;height:8px;border-radius:50%;background:#FF5246;flex-shrink:0;"></div>
              <div onclick="dScrMinus()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:700;">−</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:900;width:28px;text-align:center;">${cm.dScr||0}</div>
              <div onclick="dScrPlus()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:700;">+</div>
            </div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#3C4450;">|</div>
            <div style="display:flex;align-items:center;gap:8px;justify-content:flex-end;">
              <div onclick="eScrMinus()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:700;">−</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:900;width:28px;text-align:center;">${cm.eScr||0}</div>
              <div onclick="eScrPlus()" style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;font-weight:700;">+</div>
              <div style="width:8px;height:8px;border-radius:50%;background:#1FA0E0;flex-shrink:0;"></div>
            </div>
          </div>
        </div>

        <!-- TOGGLES -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;color:#5C6470;margin-bottom:6px;">PLATFORM</div>
            <div onclick="togglePlatform()" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.1);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.03);text-align:center;">${cm.platform==='Y' ? 'ON ✓' : 'OFF'}</div>
          </div>
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;color:#5C6470;margin-bottom:6px;">SUDDEN DEATH</div>
            <div onclick="toggleSD()" style="padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.1);font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.03);text-align:center;">${cm.sd==='Y' ? 'YES ⚡' : 'NO'}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;color:#5C6470;margin-bottom:6px;">1ST HIT</div>
            <div style="display:flex;gap:4px;">
              <div onclick="setFHD()" style="flex:1;padding:10px;border-radius:8px;border:1px solid ${fhDActive};font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;cursor:pointer;background:rgba(255,82,70,.08);text-align:center;color:#FF5246;">D</div>
              <div onclick="setFHE()" style="flex:1;padding:10px;border-radius:8px;border:1px solid ${fhEActive};font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;cursor:pointer;background:rgba(31,160,224,.08);text-align:center;color:#1FA0E0;">E</div>
            </div>
          </div>
          <div>
            <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;color:#5C6470;margin-bottom:6px;">1ST STOCK</div>
            <div style="display:flex;gap:4px;">
              <div onclick="setFSD()" style="flex:1;padding:10px;border-radius:8px;border:1px solid ${fsDActive};font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;cursor:pointer;background:rgba(255,82,70,.08);text-align:center;color:#FF5246;">D</div>
              <div onclick="setFSE()" style="flex:1;padding:10px;border-radius:8px;border:1px solid ${fsEActive};font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:800;cursor:pointer;background:rgba(31,160,224,.08);text-align:center;color:#1FA0E0;">E</div>
            </div>
          </div>
        </div>

        <!-- NOTES -->
        <div style="margin-bottom:16px;">
          <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.12em;color:#5C6470;margin-bottom:6px;">NOTES (optional)</div>
          <textarea id="session-note" oninput="setNote(this.value)" placeholder="Any notes for this match…" style="width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#EDF0F3;resize:none;outline:none;min-height:52px;box-sizing:border-box;">${cm.note||''}</textarea>
        </div>

        <!-- LOG + REDO -->
        <div style="display:flex;gap:8px;">
          <div onclick="logMatch()" style="flex:1;padding:15px;border-radius:10px;background:${cm.dc&&cm.ec&&cm.outcome?'linear-gradient(135deg,#C5241B,#0C6AAC)':'rgba(255,255,255,.06)'};text-align:center;cursor:${cm.dc&&cm.ec&&cm.outcome?'pointer':'default'};font-weight:900;font-size:15px;letter-spacing:.04em;color:${cm.dc&&cm.ec&&cm.outcome?'#fff':'#5C6470'};">LOG MATCH ✓</div>
          <div onclick="goPickD()" style="padding:15px 16px;border-radius:10px;background:rgba(255,255,255,.06);cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:#9AA3AF;">↩</div>
        </div>
      </div>` : ''}

      <!-- SESSION LOG -->
      ${S.sessionMatches.length > 0 ? `
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:#5C6470;margin-bottom:10px;">SESSION LOG · ${sessionDW}W – ${sessionEW}W · ${S.sessionMatches.length} MATCHES</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${S.sessionMatches.map((m, i) => `<div style="background:rgba(255,255,255,.02);border-radius:10px;border:1px solid rgba(255,255,255,.05);overflow:hidden;">
            <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;">
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:800;width:52px;color:${m.outcome==='D'?'#FF5246':'#1FA0E0'};flex-shrink:0;">${m.outcome==='D'?p1Name:p2Name}</div>
              <div style="font-size:12px;font-weight:700;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.dc} <span style="color:#3C4450;">vs</span> ${m.ec}</div>
              <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;flex-shrink:0;">${m.dKills||0}–${m.eKills||0}</div>
              <div onclick="editMatch(${i})" style="padding:4px 8px;border-radius:5px;background:rgba(255,255,255,.06);font-family:'JetBrains Mono',monospace;font-size:9px;cursor:pointer;color:#9AA3AF;flex-shrink:0;">EDIT</div>
              <div onclick="deleteMatch(${i})" style="padding:4px 7px;border-radius:5px;background:rgba(255,82,70,.1);font-family:'JetBrains Mono',monospace;font-size:9px;cursor:pointer;color:#FF5246;flex-shrink:0;">✕</div>
            </div>
            ${m.note ? `<div style="padding:0 14px 10px;font-family:'JetBrains Mono',monospace;font-size:10px;color:#5C6470;line-height:1.4;border-top:1px solid rgba(255,255,255,.04);padding-top:8px;margin-top:-2px;">${m.note}</div>` : ''}
          </div>`).join('')}
        </div>
      </div>` : ''}

    </div>` : '';

  return `
    <!-- HEADER -->
    <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;background:#0A0B10;">
      <div style="display:flex;align-items:center;gap:8px;">
        <div style="font-weight:900;font-size:15px;letter-spacing:.02em;">${headerTitle}</div>
        ${sessionScoreBadge}
      </div>
      <div style="display:flex;gap:8px;align-items:center;">${headerRight}</div>
    </div>
    ${loginHtml}${selectHtml}${createHtml}${sessionHtml}`;
}
