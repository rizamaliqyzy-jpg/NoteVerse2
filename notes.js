/**
 * notes.js — NoteVerse Note Management
 *
 * Persists notes to Supabase (postgres) with Row Level Security.
 * Also keeps an in-memory cache for instant UI updates.
 * Falls back to localStorage if Supabase is unreachable.
 */

const Notes = (() => {
  const FALLBACK_KEY = 'noteverse_notes_fallback';

  let _db        = null;   // supabase client
  let _userId    = null;
  let _cache     = {};     // id → note object (in-memory)
  let _saveTimer = null;
  let _dirty     = {};     // ids with pending writes

  /* ── helpers ── */
  function genId() {
    // UUID v4 compatible (Supabase expects UUID primary key)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  }

  function setSyncStatus(status) {
    if (typeof window.setSyncStatus === 'function') window.setSyncStatus(status);
  }

  /* ── lifecycle ── */
  function init(userId, supabaseClient) {
    _userId = userId;
    _db     = supabaseClient;
  }

  function reset() {
    _userId = null;
    _db     = null;
    _cache  = {};
    _dirty  = {};
    clearTimeout(_saveTimer);
  }

  /* ── fetch all from DB ── */
  async function fetchAll() {
    if (!_db || !_userId) return [];
    const { data, error } = await _db
      .from('notes')
      .select('*')
      .eq('user_id', _userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.warn('Notes fetch error:', error.message);
      // Try to load from fallback cache
      const fb = JSON.parse(localStorage.getItem(FALLBACK_KEY + '_' + _userId) || '{}');
      _cache = fb;
      setSyncStatus('offline');
      return Object.values(fb);
    }

    // Hydrate cache
    _cache = {};
    (data || []).forEach(row => {
      _cache[row.id] = {
        id:        row.id,
        title:     row.title     || '',
        content:   row.content   || '',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        dateLabel: formatDate(row.created_at),
      };
    });
    return Object.values(_cache).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  /* ── CRUD ── */
  async function create() {
    const id  = genId();
    const now = new Date().toISOString();
    const note = {
      id,
      title:     '',
      content:   '',
      createdAt: now,
      updatedAt: now,
      dateLabel: formatDate(now),
    };
    _cache[id] = note;

    // Optimistic insert
    if (_db && _userId) {
      const { error } = await _db.from('notes').insert({
        id,
        user_id:    _userId,
        title:      '',
        content:    '',
        created_at: now,
        updated_at: now,
      });
      if (error) console.warn('Note insert error:', error.message);
    }
    _saveFallback();
    return id;
  }

  function get(id)    { return _cache[id] || null; }

  function getAll() {
    return Object.values(_cache).sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  function updateTitle(id, title) {
    if (!_cache[id]) return;
    _cache[id].title     = title;
    _cache[id].updatedAt = new Date().toISOString();
    _dirty[id] = true;
  }

  function updateContent(id, html) {
    if (!_cache[id]) return;
    _cache[id].content   = html;
    _cache[id].updatedAt = new Date().toISOString();
    _dirty[id] = true;
  }

  async function remove(id) {
    delete _cache[id];
    delete _dirty[id];
    _saveFallback();
    if (_db && _userId) {
      const { error } = await _db.from('notes').delete().eq('id', id).eq('user_id', _userId);
      if (error) console.warn('Note delete error:', error.message);
    }
  }

  /* ── debounced cloud save ── */
  function scheduleSave(onSaving, onSaved) {
    if (onSaving) onSaving();
    setSyncStatus('saving');
    clearTimeout(_saveTimer);
    _saveTimer = setTimeout(async () => {
      _saveFallback();
      await _flushDirty();
      setSyncStatus('saved');
      if (onSaved) onSaved();
    }, 900);
  }

  async function _flushDirty() {
    if (!_db || !_userId) return;
    const ids = Object.keys(_dirty);
    if (!ids.length) return;
    for (const id of ids) {
      const n = _cache[id];
      if (!n) continue;
      const { error } = await _db.from('notes').upsert({
        id,
        user_id:    _userId,
        title:      n.title,
        content:    n.content,
        updated_at: n.updatedAt,
      });
      if (!error) delete _dirty[id];
      else setSyncStatus('error');
    }
  }

  function _saveFallback() {
    if (_userId) {
      localStorage.setItem(FALLBACK_KEY + '_' + _userId, JSON.stringify(_cache));
    }
  }

  /* ── plain text for AI ── */
  function getPlainText(id) {
    const note = _cache[id];
    if (!note) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = note.content;
    return `Title: ${note.title || 'Untitled'}\n\n${tmp.innerText}`.trim();
  }

  return { init, reset, fetchAll, create, get, getAll, updateTitle, updateContent, remove, getPlainText, scheduleSave };
})();
