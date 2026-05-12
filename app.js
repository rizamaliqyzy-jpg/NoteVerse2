/**
 * app.js — NoteVerse Main Controller
 * Wires Auth (Supabase) and Notes (Supabase).
 * AI sidebar disabled — can be re-enabled later by adding an API key.
 */

/* ═══════════ STARS ═══════════ */
(function initStars() {
  const canvas = document.getElementById('stars-canvas');
  const ctx    = canvas.getContext('2d');
  let stars    = [];

  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }

  function makeStars() {
    stars = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,  y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,    phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.006 + 0.002,
    }));
  }

  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const a = 0.25 + 0.75 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resize(); makeStars(); requestAnimationFrame(draw);
  window.addEventListener('resize', () => { resize(); makeStars(); });
})();


/* ═══════════ AUTH UI ═══════════ */
function switchTab(tab) {
  ['login','register'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`tab-${t}`).setAttribute('aria-selected', t === tab);
    document.getElementById(`${t}-form`).hidden = (t !== tab);
  });
}

async function doLogin() {
  const btn   = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');

  btn.textContent = '…'; btn.disabled = true;
  errEl.textContent = '';

  const result = await Auth.login(email, pass);
  btn.textContent = '✨ Enter the Universe'; btn.disabled = false;

  if (!result.ok) { errEl.textContent = '✗ ' + result.msg; return; }
  await enterApp();
}

async function doRegister() {
  const btn   = document.getElementById('register-btn');
  const un    = document.getElementById('reg-username').value.trim();
  const em    = document.getElementById('reg-email').value.trim();
  const p1    = document.getElementById('reg-pass').value;
  const p2    = document.getElementById('reg-pass2').value;
  const errEl = document.getElementById('reg-error');
  const okEl  = document.getElementById('reg-success');

  btn.textContent = '…'; btn.disabled = true;
  errEl.textContent = ''; okEl.textContent = '';

  const result = await Auth.register(un, em, p1, p2);
  btn.textContent = '🚀 Create Account'; btn.disabled = false;

  if (!result.ok) { errEl.textContent = '✗ ' + result.msg; return; }

  if (result.needsConfirmation) {
    okEl.textContent = '✓ Account created! Check your email to confirm, then sign in.';
  } else {
    okEl.textContent = '✓ Account created! Signing you in…';
    setTimeout(() => enterApp(), 800);
  }
}

async function doLogout() {
  await Auth.logout();
  Notes.reset();
  document.getElementById('app').hidden = true;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value  = '';
  document.getElementById('login-error').textContent = '';
  showEmptyState();
}


/* ═══════════ APP ENTRY ═══════════ */
async function enterApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').hidden = false;

  const user     = Auth.getUser();
  const username = Auth.getUsername();

  Notes.init(user.id, Auth.getClient());

  document.getElementById('user-display').textContent = username;
  document.getElementById('user-avatar').textContent  = username[0].toUpperCase();

  await Notes.fetchAll();
  renderNotesList();
  showEmptyState();
}


/* ═══════════ THEME ═══════════ */
(function initTheme() {
  if (localStorage.getItem('noteverse_theme') === 'dark') applyTheme(true);
})();

function toggleTheme() { applyTheme(!document.body.classList.contains('dark'), true); }

function applyTheme(dark, save) {
  document.body.classList.toggle('dark', dark);
  document.getElementById('theme-icon').textContent  = dark ? '☀️' : '🌙';
  document.getElementById('theme-label').textContent = dark ? 'Light Mode' : 'Dark Mode';
  if (save) localStorage.setItem('noteverse_theme', dark ? 'dark' : 'light');
}


/* ═══════════ NOTES UI ═══════════ */
let _activeId = null;

async function newNote() {
  const id = await Notes.create();
  renderNotesList();
  openNote(id);
}

function openNote(id) {
  _activeId = id;
  const note = Notes.get(id);
  if (!note) return;

  document.getElementById('editor-toolbar').hidden = false;
  document.getElementById('editor-wrap').hidden    = false;
  document.getElementById('empty-state').style.display = 'none';
  document.getElementById('note-title').value      = note.title;
  document.getElementById('word-editor').innerHTML = note.content;
  document.getElementById('mac-filename').textContent = (note.title || 'Untitled') + '.txt';

  renderNotesList();
  document.getElementById('word-editor').focus();
}

function showEmptyState() {
  _activeId = null;
  document.getElementById('editor-toolbar').hidden = true;
  document.getElementById('editor-wrap').hidden    = true;
  document.getElementById('empty-state').style.display = 'flex';
}

async function deleteNote(id, evt) {
  evt.stopPropagation();
  if (!confirm('Delete this note? This cannot be undone.')) return;
  await Notes.remove(id);
  renderNotesList();
  if (_activeId === id) showEmptyState();
}

function onTitleChange() {
  if (!_activeId) return;
  const title = document.getElementById('note-title').value;
  Notes.updateTitle(_activeId, title);
  document.getElementById('mac-filename').textContent = (title || 'Untitled') + '.txt';
  renderNotesList();
  scheduleUISave();
}

function onEditorChange() {
  if (!_activeId) return;
  Notes.updateContent(_activeId, document.getElementById('word-editor').innerHTML);
  scheduleUISave();
}

function scheduleUISave() {
  const ind = document.getElementById('save-indicator');
  Notes.scheduleSave(
    () => { ind.textContent = 'Saving…'; ind.style.opacity = '1'; },
    () => { ind.textContent = 'Saved ✓'; setTimeout(() => { ind.style.opacity = '0.5'; }, 1500); }
  );
}

function renderNotesList() {
  const list  = document.getElementById('notes-list');
  const notes = Notes.getAll();
  if (!notes.length) {
    list.innerHTML = '<div class="notes-empty">No notes yet.<br>Click <b>+ New Note</b> to start!</div>';
    return;
  }
  list.innerHTML = notes.map(n => {
    const active = n.id === _activeId;
    const title  = esc(n.title || 'Untitled');
    return `<div class="note-item${active ? ' active' : ''}" role="listitem" onclick="openNote('${n.id}')" tabindex="0" onkeydown="if(event.key==='Enter')openNote('${n.id}')">
      <button class="note-item-delete" onclick="deleteNote('${n.id}',event)" aria-label="Delete ${title}">✕</button>
      <div class="note-item-title">${title}</div>
      <div class="note-item-date">${n.dateLabel}</div>
    </div>`;
  }).join('');
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}


/* ═══════════ KEYBOARD SHORTCUTS ═══════════ */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !document.getElementById('app').hidden) {
    e.preventDefault(); newNote();
  }
});

document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('reg-pass2').addEventListener('keydown',  e => { if (e.key === 'Enter') doRegister(); });


/* ═══════════ BOOT ═══════════ */
Auth.init();

(async () => {
  const session = await Auth.checkSession();
  if (session) {
    await enterApp();
  } else {
    document.getElementById('auth-screen').style.display = 'flex';
  }
})();
