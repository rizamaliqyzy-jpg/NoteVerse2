/**
 * app.js — NoteVerse v4 Cinematic Controller
 */

/* ═══ PARTICLES ═══ */
(function spawnParticles() {
  const container = document.getElementById('particles');
  const colors = ['#a78bfa','#f472b6','#fbbf24','#34d399','#60a5fa','#fb923c'];
  function spawn() {
    const el = document.createElement('div');
    el.className = 'particle';
    const size = Math.random() * 6 + 3;
    el.style.cssText = `
      width:${size}px;height:${size}px;
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${8+Math.random()*12}s;
      animation-delay:${Math.random()*5}s;
      box-shadow:0 0 ${size*2}px currentColor;
    `;
    container.appendChild(el);
    setTimeout(() => el.remove(), 20000);
  }
  setInterval(spawn, 400);
  for (let i = 0; i < 15; i++) spawn();
})();

/* ═══ STARS CANVAS ═══ */
(function initStars() {
  const canvas = document.getElementById('stars-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];
  function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
  function makeStars() {
    stars = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.3, phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.005 + 0.001,
    }));
  }
  function draw(t) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      const a = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * s.speed + s.phase));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  resize(); makeStars(); requestAnimationFrame(draw);
  window.addEventListener('resize', () => { resize(); makeStars(); });
})();

/* ═══ KEYBOARD ANIMATION ═══ */
const keyMap = {
  'a':'A','b':'B','c':'C','d':'D','e':'E','f':'F','g':'G','h':'H','i':'I',
  'j':'J','k':'K','l':'L','m':'M','n':'N','o':'O','p':'P','q':'Q','r':'R',
  's':'S','t':'T','u':'U','v':'V','w':'W','x':'X','y':'Y','z':'Z',
  ' ':'spacebar', 'Enter':'return', 'Backspace':'⌫', 'Shift':'shift',
  'Tab':'tab', 'CapsLock':'caps',
};

document.addEventListener('keydown', e => {
  if (document.getElementById('app').hidden) return;
  const label = keyMap[e.key] || e.key;
  const keys = document.querySelectorAll('.kb-key');
  keys.forEach(k => {
    const text = k.textContent.trim().toLowerCase();
    const match = label.toLowerCase();
    if (text === match || (match === 'spacebar' && k.classList.contains('spacebar'))) {
      k.classList.add('lit', 'pressed');
      setTimeout(() => k.classList.remove('lit', 'pressed'), 180);
    }
  });
});

/* ═══ AUTH UI ═══ */
function switchTab(tab) {
  ['login','register'].forEach(t => {
    document.getElementById(`tab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`${t}-form`).hidden = (t !== tab);
  });
}

async function doLogin() {
  const btn   = document.getElementById('login-btn');
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-error');
  btn.querySelector('.btn-text').textContent = '✨ Opening portal…';
  btn.disabled = true; errEl.textContent = '';
  const result = await Auth.login(email, pass);
  btn.querySelector('.btn-text').textContent = '✨ Enter the Universe';
  btn.disabled = false;
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
  btn.querySelector('.btn-text').textContent = '🚀 Creating magic…';
  btn.disabled = true; errEl.textContent = ''; okEl.textContent = '';
  const result = await Auth.register(un, em, p1, p2);
  btn.querySelector('.btn-text').textContent = '🚀 Begin the Adventure';
  btn.disabled = false;
  if (!result.ok) { errEl.textContent = '✗ ' + result.msg; return; }
  if (result.needsConfirmation) {
    okEl.textContent = '✓ Check your email to confirm, then sign in!';
  } else {
    okEl.textContent = '✓ Welcome to NoteVerse! ✨';
    setTimeout(() => enterApp(), 900);
  }
}

async function doLogout() {
  await Auth.logout(); Notes.reset();
  document.getElementById('app').hidden = true;
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').value = '';
  document.getElementById('login-pass').value  = '';
  document.getElementById('login-error').textContent = '';
  showEmptyState();
}

/* ═══ APP ENTRY ═══ */
async function enterApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').hidden = false;
  const user     = Auth.getUser();
  const username = Auth.getUsername();
  Notes.init(user.id, Auth.getClient());
  document.getElementById('user-display').textContent = username;
  document.getElementById('user-avatar').textContent  = username[0].toUpperCase();
  const greetings = ['✨ Ready to create?', '🌟 What will you write today?', '💫 Ideas await!', '🚀 Let\'s go, ' + username + '!'];
  document.getElementById('topbar-greeting').textContent = greetings[Math.floor(Math.random() * greetings.length)];
  await Notes.fetchAll();
  renderNotesList();
  showEmptyState();
}

/* ═══ THEME ═══ */
(function initTheme() {
  if (localStorage.getItem('noteverse_theme') === 'light') applyTheme(true);
})();

function toggleTheme() { applyTheme(!document.body.classList.contains('light'), true); }

function applyTheme(light, save) {
  document.body.classList.toggle('light', light);
  document.getElementById('theme-icon').textContent = light ? '🌞' : '🌙';
  if (save) localStorage.setItem('noteverse_theme', light ? 'light' : 'dark');
}

/* ═══ SYNC STATUS ═══ */
function setSyncStatus(status) {
  const icon  = document.getElementById('sync-icon');
  const label = document.getElementById('sync-label');
  if (!icon) return;
  const s = { saving:['🔄','Saving…'], saved:['☁️','Synced'], error:['⚠️','Error'], offline:['📴','Offline'] };
  const [i, l] = s[status] || s.saved;
  icon.textContent = i; label.textContent = l;
}

/* ═══ NOTES UI ═══ */
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
  document.getElementById('empty-state').style.display = 'none';
  const scene = document.getElementById('macbook-scene');
  scene.hidden = false;
  scene.style.animation = 'none';
  requestAnimationFrame(() => { scene.style.animation = ''; });
  document.getElementById('note-title').value      = note.title;
  document.getElementById('word-editor').innerHTML = note.content;
  document.getElementById('mac-filename').textContent = (note.title || 'Untitled') + '.txt';
  renderNotesList();
  document.getElementById('word-editor').focus();
}

function showEmptyState() {
  _activeId = null;
  document.getElementById('macbook-scene').hidden = true;
  document.getElementById('empty-state').style.display = 'flex';
}

async function deleteNote(id, evt) {
  evt.stopPropagation();
  if (!confirm('Delete this note forever? ✨')) return;
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
  const dot = document.getElementById('save-indicator');
  dot.classList.add('saving');
  Notes.scheduleSave(
    null,
    () => { dot.classList.remove('saving'); setSyncStatus('saved'); }
  );
  setSyncStatus('saving');
}

function renderNotesList() {
  const list  = document.getElementById('notes-list');
  const notes = Notes.getAll();
  if (!notes.length) {
    list.innerHTML = '<div class="notes-empty">No notes yet ✨<br>Click <b>+ New Note</b>!</div>';
    return;
  }
  list.innerHTML = notes.map(n => {
    const active = n.id === _activeId;
    const title  = esc(n.title || 'Untitled');
    return `<div class="note-item${active ? ' active' : ''}" onclick="openNote('${n.id}')" tabindex="0">
      <button class="note-item-delete" onclick="deleteNote('${n.id}',event)">✕</button>
      <div class="note-item-title">${title}</div>
      <div class="note-item-date">${n.dateLabel}</div>
    </div>`;
  }).join('');
}

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ═══ KEYBOARD SHORTCUTS ═══ */
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !document.getElementById('app').hidden) {
    e.preventDefault(); newNote();
  }
});
document.getElementById('login-pass').addEventListener('keydown',  e => { if (e.key === 'Enter') doLogin(); });
document.getElementById('reg-pass2').addEventListener('keydown',   e => { if (e.key === 'Enter') doRegister(); });

/* ═══ BOOT ═══ */
Auth.init();
(async () => {
  const session = await Auth.checkSession();
  if (session) { await enterApp(); }
  else { document.getElementById('auth-screen').style.display = 'flex'; }
})();
