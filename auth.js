/**
 * auth.js — NoteVerse Authentication via Supabase (fixed)
 */

const Auth = (() => {
  let _supabase = null;
  let _session  = null;
  let _profile  = null;

  function init() {
    _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    _supabase.auth.onAuthStateChange(async (event, session) => {
      _session = session;
      if (session?.user) await _loadProfile(session.user.id);
      else _profile = null;
    });
  }

  async function _loadProfile(userId) {
    try {
      const { data } = await _supabase
        .from('profiles').select('username').eq('id', userId).single();
      _profile = data;
    } catch(e) { _profile = null; }
  }

  async function register(username, email, password, confirmPassword) {
    if (!username || !email || !password)
      return { ok: false, msg: 'Please fill in all fields.' };
    if (username.length < 3)
      return { ok: false, msg: 'Display name must be at least 3 characters.' };
    if (password.length < 8)
      return { ok: false, msg: 'Password must be at least 8 characters.' };
    if (password !== confirmPassword)
      return { ok: false, msg: 'Passwords do not match.' };

    const { data, error } = await _supabase.auth.signUp({
      email, password,
      options: { data: { username } },
    });

    if (error) return { ok: false, msg: error.message };

    // Save profile
    if (data.user) {
      await _supabase.from('profiles').upsert({ id: data.user.id, username });
    }

    // Got session directly — great, log in
    if (data.session) {
      _session = data.session;
      await _loadProfile(data.user.id);
      return { ok: true, needsConfirmation: false };
    }

    // No session returned — try signing in immediately
    const loginResult = await login(email, password);
    if (loginResult.ok) return { ok: true, needsConfirmation: false };

    // Still nothing — needs email confirmation
    return { ok: true, needsConfirmation: true };
  }

  async function login(email, password) {
    if (!email || !password)
      return { ok: false, msg: 'Please fill in all fields.' };

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: error.message };

    _session = data.session;
    if (data.user) await _loadProfile(data.user.id);
    return { ok: true };
  }

  async function logout() {
    await _supabase.auth.signOut();
    _session = null; _profile = null;
  }

  function getSession()     { return _session; }
  function getUser()        { return _session?.user || null; }
  function getUsername()    {
    return _profile?.username
      || _session?.user?.user_metadata?.username
      || _session?.user?.email?.split('@')[0]
      || 'Explorer';
  }
  function getClient()      { return _supabase; }
  function isLoggedIn()     { return !!_session; }
  function getAccessToken() { return _session?.access_token || null; }

  async function checkSession() {
    const { data } = await _supabase.auth.getSession();
    _session = data.session;
    if (_session?.user) await _loadProfile(_session.user.id);
    return _session;
  }

  return { init, register, login, logout, getSession, getUser, getUsername, getClient, isLoggedIn, checkSession, getAccessToken };
})();
