/* tab-admin.js — ADMIN tab render + actions
   Only ever reachable when isSuperAdmin() is true (see app-core.js):
   the logged-in player must have is_admin = true on their players row.
   NOTE: this gate controls UI visibility only. Real protection lives
   in Postgres RLS policies on players/rivalries/matches/invitations
   restricting INSERT/UPDATE/DELETE to the same is_admin account —
   see sql/rls-policies.sql.
*/

/* ─── DATA LOADING ───────────────────────────────────────────── */

async function loadAdminData() {
  if (!isSuperAdmin()) return;
  S.adminLoading = true;
  S.adminError = '';
  render();

  const sb = window._supabase;
  try {
    const [pRes, rRes, iRes, mRes] = await Promise.all([
      sb.from('players').select('id,name,email,color,is_admin,auth_id,created_at').order('id', { ascending: true }),
      sb.from('rivalries').select('id,name,p1_id,p2_id,created_at').order('id', { ascending: true }),
      sb.from('invitations').select('id,invited_by_id,rivalry_id,email,status,created_at,accepted_at').order('created_at', { ascending: false }),
      sb.from('matches').select('*').order('date', { ascending: false }).order('id', { ascending: false }).limit(2000)
    ]);
    if (pRes.error) throw pRes.error;
    if (rRes.error) throw rRes.error;
    if (mRes.error) throw mRes.error;

    Object.assign(S, {
      adminPlayers:    pRes.data || [],
      adminRivalries:  rRes.data || [],
      adminInvitations: iRes.error ? [] : (iRes.data || []),
      adminMatches:    mRes.data || [],
      adminLoaded: true,
      adminLoading: false
    });
  } catch (err) {
    Object.assign(S, { adminLoading: false, adminError: 'Failed to load admin data: ' + (err.message || err) });
  }
  render();
}

function refreshAdminData() { S.adminLoaded = false; loadAdminData(); }

/* ─── FILTER / SEARCH (client-side, over the already-loaded set) ── */

function setAdminMatchFilter(val) { S.adminMatchFilter = val; S.adminMatchLimit = 50; render(); }
function setAdminMatchSearch(val) { S.adminMatchSearch = val; S.adminMatchLimit = 50; render(); }
function loadMoreAdminMatches() { S.adminMatchLimit += 50; render(); }

/* ─── DELETE CONFIRMATION FLOW ──────────────────────────────── */

function requestDeletePlayer(id) {
  const p = S.adminPlayers.find(x => x.id === id);
  if (!p) return;
  const rivalryIds = S.adminRivalries.filter(r => r.p1_id === id || r.p2_id === id).map(r => r.id);
  const matchCount = S.adminMatches.filter(m => rivalryIds.includes(m.rivalry_id)).length;
  const extra = rivalryIds.length
    ? ` This will also permanently delete ${rivalryIds.length} rivalr${rivalryIds.length === 1 ? 'y' : 'ies'} and ${matchCount} match${matchCount === 1 ? '' : 'es'} involving them.`
    : '';
  S.adminConfirm = {
    type: 'player', id,
    title: `Delete ${p.name || 'this player'}?`,
    message: `This permanently removes ${p.name || 'this player'} from the players table.${extra} This cannot be undone.`
  };
  render();
}

function requestDeleteRivalry(id) {
  const r = S.adminRivalries.find(x => x.id === id);
  if (!r) return;
  const matchCount = S.adminMatches.filter(m => m.rivalry_id === id).length;
  S.adminConfirm = {
    type: 'rivalry', id,
    title: `Delete ${r.name || 'this rivalry'}?`,
    message: `This permanently deletes the rivalry "${r.name}"${matchCount ? ` and all ${matchCount} match${matchCount === 1 ? '' : 'es'} logged under it` : ''}. This cannot be undone.`
  };
  render();
}

function requestDeleteMatch(id) {
  const m = S.adminMatches.find(x => x.id === id);
  if (!m) return;
  S.adminConfirm = {
    type: 'match', id,
    title: 'Delete this match?',
    message: `${m.p1_char} vs ${m.p2_char} on ${m.date} will be permanently deleted. This cannot be undone.`
  };
  render();
}

function requestDeleteInvitation(id) {
  const inv = S.adminInvitations.find(x => x.id === id);
  if (!inv) return;
  S.adminConfirm = {
    type: 'invitation', id,
    title: 'Cancel this invitation?',
    message: `The pending invitation to ${inv.email} will be permanently deleted.`
  };
  render();
}

function cancelAdminConfirm() { S.adminConfirm = null; render(); }

async function confirmAdminDelete() {
  const c = S.adminConfirm;
  if (!c || S.adminBusy) return;
  S.adminBusy = true; render();
  const sb = window._supabase;
  try {
    if (c.type === 'player') {
      const rivalryIds = S.adminRivalries.filter(r => r.p1_id === c.id || r.p2_id === c.id).map(r => r.id);
      if (rivalryIds.length) {
        await sb.from('matches').delete().in('rivalry_id', rivalryIds);
        await sb.from('invitations').delete().in('rivalry_id', rivalryIds);
        await sb.from('rivalries').delete().in('id', rivalryIds);
      }
      await sb.from('invitations').delete().eq('invited_by_id', c.id);
      const { error } = await sb.from('players').delete().eq('id', c.id);
      if (error) throw error;
    } else if (c.type === 'rivalry') {
      await sb.from('matches').delete().eq('rivalry_id', c.id);
      await sb.from('invitations').delete().eq('rivalry_id', c.id);
      const { error } = await sb.from('rivalries').delete().eq('id', c.id);
      if (error) throw error;
    } else if (c.type === 'match') {
      const { error } = await sb.from('matches').delete().eq('id', c.id);
      if (error) throw error;
    } else if (c.type === 'invitation') {
      const { error } = await sb.from('invitations').delete().eq('id', c.id);
      if (error) throw error;
    }
    const deletedType = c.type, deletedRivalryId = c.id;
    S.adminConfirm = null;
    S.adminBusy = false;
    await loadAdminData(); // refetch everything so counts/lists stay accurate
    // If whatever's driving the live dashboard just got deleted, reload it too
    if (deletedType === 'rivalry' && deletedRivalryId === window._currentRivalryId) {
      loadSmashData(window._currentRivalryId);
    } else if (deletedType === 'player') {
      loadSmashData(window._currentRivalryId);
    }
  } catch (err) {
    S.adminBusy = false;
    S.adminConfirm = null;
    S.adminError = 'Delete failed: ' + (err.message || err);
    render();
  }
}

/* ─── EDIT MATCH ─────────────────────────────────────────────── */

function startEditMatch(id) {
  const m = S.adminMatches.find(x => x.id === id);
  if (!m) return;
  S.adminEditMatch = { ...m };
  render();
}
function cancelEditMatch() { S.adminEditMatch = null; render(); }
function setAdminEditField(field, value) { if (S.adminEditMatch) S.adminEditMatch[field] = value; }
function setAdminEditFieldR(field, value) { if (S.adminEditMatch) { S.adminEditMatch[field] = value; render(); } }

async function saveEditMatch() {
  const m = S.adminEditMatch;
  if (!m || S.adminBusy) return;
  S.adminBusy = true; render();
  const sb = window._supabase;
  const payload = {
    date:        m.date,
    p1_char:     m.p1_char,
    p2_char:     m.p2_char,
    p1_kills:    Number(m.p1_kills) || 0,
    p2_kills:    Number(m.p2_kills) || 0,
    p1_screams:  Number(m.p1_screams) || 0,
    p2_screams:  Number(m.p2_screams) || 0,
    p1_controller_throws: Number(m.p1_controller_throws) || 0,
    p2_controller_throws: Number(m.p2_controller_throws) || 0,
    winner:      m.winner,
    first_hit:   m.first_hit || null,
    first_stock: m.first_stock || null,
    platforms:   !!m.platforms,
    sudden_death: !!m.sudden_death,
    venue:       m.venue,
    notes:       m.notes || null
  };
  const { error } = await sb.from('matches').update(payload).eq('id', m.id);
  S.adminBusy = false;
  if (error) { S.adminError = 'Save failed: ' + error.message; render(); return; }
  const rivalryId = m.rivalry_id;
  S.adminEditMatch = null;
  await loadAdminData();
  if (rivalryId === window._currentRivalryId) loadSmashData(window._currentRivalryId);
}

/* ─── RENDER ─────────────────────────────────────────────────── */

const ADMIN_LABEL = '#5C6470', ADMIN_CARD = '#0F1217', ADMIN_BORDER = 'rgba(255,255,255,.07)';

function adminSectionHeader(title, count, right) {
  return `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
    <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.16em;color:${ADMIN_LABEL};font-weight:700;">${title}${count != null ? ` · ${count}` : ''}</div>
    <div>${right || ''}</div>
  </div>`;
}

function adminBtn(label, onclick, danger) {
  return `<div onclick="${onclick}" style="padding:6px 12px;border-radius:7px;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:.05em;background:${danger ? 'rgba(255,82,70,.12)' : 'rgba(255,255,255,.06)'};color:${danger ? '#FF5246' : '#9AA3AF'};white-space:nowrap;">${label}</div>`;
}

function renderAdmin() {
  if (!isSuperAdmin()) return '';

  if (S.adminLoading && !S.adminLoaded) {
    return `<div style="padding:80px 20px;text-align:center;color:${ADMIN_LABEL};font-family:'JetBrains Mono',monospace;font-size:12px;">Loading admin data…</div>`;
  }

  const players   = S.adminPlayers || [];
  const rivalries = S.adminRivalries || [];
  const invites   = (S.adminInvitations || []).filter(i => i.status === 'pending');
  const matches   = S.adminMatches || [];

  const playerMap = {};
  players.forEach(p => { playerMap[p.id] = p; });

  const matchCountByRivalry = {};
  matches.forEach(m => { matchCountByRivalry[m.rivalry_id] = (matchCountByRivalry[m.rivalry_id] || 0) + 1; });

  /* ── PLAYERS ── */
  const playerRows = players.map(p => `
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.04);">
      <div style="width:14px;height:14px;border-radius:50%;background:${esc(p.color || '#5C6470')};flex-shrink:0;border:1px solid rgba(255,255,255,.15);"></div>
      <div style="flex:1;min-width:0;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-weight:800;font-size:13px;">${esc(p.name || '(unnamed)')}</span>
          ${p.is_admin ? `<span style="font-family:'JetBrains Mono',monospace;font-size:8px;font-weight:800;letter-spacing:.1em;padding:2px 6px;border-radius:4px;background:rgba(255,255,255,.08);color:#EDF0F3;">ADMIN</span>` : ''}
        </div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${ADMIN_LABEL};margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(p.email || 'no email on file')} · id ${p.id}</div>
      </div>
      ${adminBtn('DELETE', `requestDeletePlayer(${p.id})`, true)}
    </div>`).join('');

  /* ── RIVALRIES ── */
  const rivalryRows = rivalries.map(r => {
    const p1 = playerMap[r.p1_id], p2 = playerMap[r.p2_id];
    return `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.04);">
      <div style="display:flex;flex-direction:column;gap:3px;flex-shrink:0;">
        <div style="width:24px;height:10px;border-radius:3px;background:${esc((p1 && p1.color) || '#FF5246')};"></div>
        <div style="width:24px;height:10px;border-radius:3px;background:${esc((p2 && p2.color) || '#1FA0E0')};"></div>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-weight:800;font-size:13px;">${esc(r.name || `${(p1 && p1.name) || 'P1'} vs ${(p2 && p2.name) || 'P2'}`)}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${ADMIN_LABEL};margin-top:2px;">id ${r.id} · ${matchCountByRivalry[r.id] || 0} games logged</div>
      </div>
      ${adminBtn('DELETE', `requestDeleteRivalry(${r.id})`, true)}
    </div>`;
  }).join('');

  /* ── INVITATIONS ── */
  const inviteSection = invites.length ? `
  <div style="background:${ADMIN_CARD};border-radius:14px;border:1px solid ${ADMIN_BORDER};overflow:hidden;margin-bottom:22px;">
    ${adminSectionHeader('PENDING INVITATIONS', invites.length).replace('margin-bottom:10px;', 'margin-bottom:0;padding:14px 16px 0;')}
    ${invites.map(i => `<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.04);">
      <div style="flex:1;min-width:0;">
        <div style="font-weight:700;font-size:13px;">${esc(i.email)}</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${ADMIN_LABEL};margin-top:2px;">rivalry ${i.rivalry_id} · sent ${(i.created_at || '').slice(0, 10)}</div>
      </div>
      ${adminBtn('CANCEL', `requestDeleteInvitation(${i.id})`, true)}
    </div>`).join('')}
  </div>` : '';

  /* ── MATCHES ── */
  let filtered = matches;
  if (S.adminMatchFilter !== 'all') filtered = filtered.filter(m => String(m.rivalry_id) === String(S.adminMatchFilter));
  const q = (S.adminMatchSearch || '').toLowerCase().trim();
  if (q) {
    filtered = filtered.filter(m =>
      (m.p1_char || '').toLowerCase().includes(q) ||
      (m.p2_char || '').toLowerCase().includes(q) ||
      (m.notes || '').toLowerCase().includes(q) ||
      (m.venue || '').toLowerCase().includes(q) ||
      (m.date || '').includes(q)
    );
  }
  const shownMatches = filtered.slice(0, S.adminMatchLimit);

  const rivalryOptions = `<option value="all"${S.adminMatchFilter === 'all' ? ' selected' : ''}>All rivalries</option>` +
    rivalries.map(r => `<option value="${r.id}"${String(S.adminMatchFilter) === String(r.id) ? ' selected' : ''}>${esc(r.name)}</option>`).join('');

  const matchRows = shownMatches.map(m => {
    const isEditing = S.adminEditMatch && S.adminEditMatch.id === m.id;
    if (isEditing) return renderAdminMatchEditRow(S.adminEditMatch);
    const dWin = m.winner === 'p1';
    return `<div style="display:flex;align-items:center;gap:10px;padding:11px 16px;border-bottom:1px solid rgba(255,255,255,.04);flex-wrap:wrap;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:10px;color:${ADMIN_LABEL};width:76px;flex-shrink:0;">${esc(m.date || '')}</div>
      <div style="flex:1;min-width:160px;font-size:12px;font-weight:700;">
        <span style="color:${dWin ? '#FF5246' : '#EDF0F3'};">${esc(m.p1_char || '')}</span>
        <span style="color:#3C4450;font-weight:400;"> vs </span>
        <span style="color:${!dWin ? '#1FA0E0' : '#EDF0F3'};">${esc(m.p2_char || '')}</span>
      </div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:${ADMIN_LABEL};flex-shrink:0;">${m.p1_kills || 0}–${m.p2_kills || 0}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;padding:2px 7px;border-radius:4px;background:rgba(255,255,255,.05);color:${ADMIN_LABEL};flex-shrink:0;">${esc(m.venue || '')}</div>
      <div style="display:flex;gap:6px;flex-shrink:0;margin-left:auto;">
        ${adminBtn('EDIT', `startEditMatch(${m.id})`, false)}
        ${adminBtn('DELETE', `requestDeleteMatch(${m.id})`, true)}
      </div>
      ${m.notes ? `<div style="width:100%;font-family:'JetBrains Mono',monospace;font-size:10px;color:${ADMIN_LABEL};padding-top:4px;">${esc(m.notes)}</div>` : ''}
    </div>`;
  }).join('');

  const loadMore = filtered.length > shownMatches.length
    ? `<div onclick="loadMoreAdminMatches()" style="padding:12px;text-align:center;cursor:pointer;font-family:'JetBrains Mono',monospace;font-size:10px;color:${ADMIN_LABEL};border-top:1px solid rgba(255,255,255,.04);">LOAD MORE (${filtered.length - shownMatches.length} remaining)</div>`
    : '';

  const confirmModal = S.adminConfirm ? `
  <div style="position:fixed;inset:0;background:rgba(7,8,13,.8);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px;">
    <div style="max-width:420px;width:100%;background:#12151B;border-radius:14px;border:1px solid rgba(255,82,70,.25);padding:24px;">
      <div style="font-weight:900;font-size:17px;margin-bottom:10px;color:#FF5246;">⚠ ${esc(S.adminConfirm.title)}</div>
      <div style="font-size:13px;color:#C9CFD6;line-height:1.5;margin-bottom:20px;">${esc(S.adminConfirm.message)}</div>
      ${S.adminError ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#FB6256;padding:8px 12px;border-radius:8px;background:rgba(255,82,70,.08);margin-bottom:14px;">${esc(S.adminError)}</div>` : ''}
      <div style="display:flex;gap:10px;">
        <div onclick="cancelAdminConfirm()" style="flex:1;padding:13px;border-radius:9px;background:rgba(255,255,255,.07);text-align:center;cursor:pointer;font-weight:700;font-size:13px;">Cancel</div>
        <div onclick="confirmAdminDelete()" style="flex:1;padding:13px;border-radius:9px;background:#C5241B;text-align:center;cursor:${S.adminBusy ? 'default' : 'pointer'};font-weight:900;font-size:13px;color:#fff;opacity:${S.adminBusy ? .6 : 1};">${S.adminBusy ? 'DELETING…' : 'DELETE'}</div>
      </div>
    </div>
  </div>` : '';

  return `
<div style="max-width:1080px;margin:0 auto;padding:34px 18px 90px;">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:8px;">
    <div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.2em;color:${ADMIN_LABEL};margin-bottom:8px;">ADMIN ONLY · 06</div>
      <h1 style="font-weight:900;font-size:36px;letter-spacing:-.02em;margin:0;">Admin</h1>
    </div>
    ${adminBtn(S.adminLoading ? 'REFRESHING…' : '⟳ REFRESH', 'refreshAdminData()', false)}
  </div>
  <p style="color:#9AA3AF;font-size:14px;line-height:1.5;margin:8px 0 26px;">Manage players, rivalries, and logged matches. Deletions are permanent and ask for confirmation first.</p>

  ${S.adminError && !S.adminConfirm ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#FB6256;padding:10px 14px;border-radius:8px;background:rgba(255,82,70,.08);border:1px solid rgba(255,82,70,.2);margin-bottom:20px;">${esc(S.adminError)}</div>` : ''}

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:26px;">
    ${[['PLAYERS', players.length], ['RIVALRIES', rivalries.length], ['MATCHES', matches.length], ['PENDING INVITES', invites.length]].map(([label, n]) => `
    <div style="background:${ADMIN_CARD};border:1px solid ${ADMIN_BORDER};border-radius:12px;padding:14px 16px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.1em;color:${ADMIN_LABEL};margin-bottom:6px;">${label}</div>
      <div style="font-weight:900;font-size:24px;">${n}</div>
    </div>`).join('')}
  </div>

  <div style="background:${ADMIN_CARD};border-radius:14px;border:1px solid ${ADMIN_BORDER};overflow:hidden;margin-bottom:22px;">
    <div style="padding:14px 16px 0;">${adminSectionHeader('PLAYERS', players.length)}</div>
    ${playerRows || `<div style="padding:20px 16px;color:${ADMIN_LABEL};font-size:12px;">No players found.</div>`}
  </div>

  <div style="background:${ADMIN_CARD};border-radius:14px;border:1px solid ${ADMIN_BORDER};overflow:hidden;margin-bottom:22px;">
    <div style="padding:14px 16px 0;">${adminSectionHeader('RIVALRIES', rivalries.length)}</div>
    ${rivalryRows || `<div style="padding:20px 16px;color:${ADMIN_LABEL};font-size:12px;">No rivalries found.</div>`}
  </div>

  ${inviteSection}

  <div style="background:${ADMIN_CARD};border-radius:14px;border:1px solid ${ADMIN_BORDER};overflow:hidden;">
    <div style="padding:14px 16px 0;">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px;">
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.16em;color:${ADMIN_LABEL};font-weight:700;">MATCHES · ${filtered.length}${filtered.length !== matches.length ? ` of ${matches.length}` : ''}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <select onchange="setAdminMatchFilter(this.value)" style="padding:7px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:10px;outline:none;">${rivalryOptions}</select>
          <input type="text" value="${esc(S.adminMatchSearch)}" oninput="setAdminMatchSearch(this.value)" placeholder="Search character, note, venue…" style="padding:7px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:10px;outline:none;min-width:180px;">
        </div>
      </div>
    </div>
    ${matchRows || `<div style="padding:20px 16px;color:${ADMIN_LABEL};font-size:12px;">No matches match this filter.</div>`}
    ${loadMore}
  </div>
</div>
${confirmModal}`;
}

function renderAdminMatchEditRow(m) {
  const sel = (val, opts) => opts.map(([v, l]) => `<option value="${v}"${String(val) === String(v) ? ' selected' : ''}>${l}</option>`).join('');
  return `<div style="padding:16px;border-bottom:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.02);">
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin-bottom:10px;">
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">DATE</div>
        <input type="date" value="${esc((m.date || '').slice(0, 10))}" oninput="setAdminEditField('date', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;box-sizing:border-box;">
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#FF5246;margin-bottom:4px;">P1 CHARACTER</div>
        <input type="text" value="${esc(m.p1_char)}" oninput="setAdminEditField('p1_char', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-size:12px;outline:none;box-sizing:border-box;">
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:#1FA0E0;margin-bottom:4px;">P2 CHARACTER</div>
        <input type="text" value="${esc(m.p2_char)}" oninput="setAdminEditField('p2_char', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-size:12px;outline:none;box-sizing:border-box;">
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">WINNER</div>
        <select onchange="setAdminEditFieldR('winner', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;">${sel(m.winner, [['p1', 'P1'], ['p2', 'P2']])}</select>
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">P1 KILLS</div>
        <input type="number" min="0" max="5" value="${m.p1_kills || 0}" oninput="setAdminEditField('p1_kills', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;box-sizing:border-box;">
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">P2 KILLS</div>
        <input type="number" min="0" max="5" value="${m.p2_kills || 0}" oninput="setAdminEditField('p2_kills', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;box-sizing:border-box;">
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">P1 SCREAMS</div>
        <input type="number" min="0" value="${m.p1_screams || 0}" oninput="setAdminEditField('p1_screams', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;box-sizing:border-box;">
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">P2 SCREAMS</div>
        <input type="number" min="0" value="${m.p2_screams || 0}" oninput="setAdminEditField('p2_screams', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;box-sizing:border-box;">
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">1ST HIT</div>
        <select onchange="setAdminEditFieldR('first_hit', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;">${sel(m.first_hit || '', [['', 'None'], ['p1', 'P1'], ['p2', 'P2']])}</select>
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">1ST STOCK</div>
        <select onchange="setAdminEditFieldR('first_stock', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;">${sel(m.first_stock || '', [['', 'None'], ['p1', 'P1'], ['p2', 'P2']])}</select>
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">VENUE</div>
        <select onchange="setAdminEditFieldR('venue', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;">${sel(m.venue, [['Online', 'Online'], ['In-Person', 'In-Person']])}</select>
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">PLATFORMS</div>
        <select onchange="setAdminEditFieldR('platforms', this.value === 'true')" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;">${sel(!!m.platforms, [[true, 'On'], [false, 'Off']])}</select>
      </div>
      <div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">SUDDEN DEATH</div>
        <select onchange="setAdminEditFieldR('sudden_death', this.value === 'true')" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;">${sel(!!m.sudden_death, [[true, 'Yes'], [false, 'No']])}</select>
      </div>
    </div>
    <div style="margin-bottom:12px;">
      <div style="font-family:'JetBrains Mono',monospace;font-size:9px;color:${ADMIN_LABEL};margin-bottom:4px;">NOTES</div>
      <textarea oninput="setAdminEditField('notes', this.value)" style="width:100%;padding:8px 10px;border-radius:7px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);color:#EDF0F3;font-family:'JetBrains Mono',monospace;font-size:11px;outline:none;min-height:50px;box-sizing:border-box;resize:vertical;">${esc(m.notes || '')}</textarea>
    </div>
    <div style="display:flex;gap:8px;">
      <div onclick="saveEditMatch()" style="padding:10px 18px;border-radius:8px;background:linear-gradient(135deg,#C5241B,#0C6AAC);cursor:${S.adminBusy ? 'default' : 'pointer'};font-weight:800;font-size:12px;color:#fff;opacity:${S.adminBusy ? .6 : 1};">${S.adminBusy ? 'SAVING…' : 'SAVE'}</div>
      <div onclick="cancelEditMatch()" style="padding:10px 18px;border-radius:8px;background:rgba(255,255,255,.07);cursor:pointer;font-weight:700;font-size:12px;color:#9AA3AF;">CANCEL</div>
    </div>
  </div>`;
}
