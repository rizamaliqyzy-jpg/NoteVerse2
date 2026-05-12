/**
 * auth.js — NoteVerse Authentication via Supabase
 *
 * Uses Supabase Auth (email + password).
 * Passwords are hashed with bcrypt server-side — never touch client code.
 * Sessions are JWT-based and auto-refreshed by the Supabase client.
 */

const Auth = (() => {
  let _supabase = null;
  let _session  = null;
  let _profile  = null;

  /* ── init ── */
  function init() {
    _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

    // Listen for auth state changes (login, logout, token refresh)
    _supabase.auth.onAuthStateChange(async (event, session) => {
      _session = session;
      if (session?.user) {
        await _loadProfile(session.user.id);
      } else {
        _profile = null;
      }
    });
  }

  async function _loadProfile(userId) {
    const { data } = await _supabase
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .single();
    _profile = data;
  }

  /* ── register ── */
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
      email,
      password,
      options: {
        data: { username },         // stored in auth.users.raw_user_meta_data
      },
    });

    if (error) return { ok: false, msg: error.message };

    // Insert into public profiles table (trigger can also do this — see SQL setup)
    if (data.user) {
      await _supabase.from('profiles').upsert({
        id:       data.user.id,
        username: username,
      });
    }

    return { ok: true, needsConfirmation: !data.session };
  }

  /* ── login ── */
  async function login(email, password) {
    if (!email || !password)
      return { ok: false, msg: 'Please fill in all fields.' };

    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, msg: error.message };

    _session = data.session;
    await _loadProfile(data.user.id);
    return { ok: true };
  }

  /* ── logout ── */
  async function logout() {
    await _supabase.auth.signOut();
    _session = null;
    _profile = null;
  }

  /* ── session helpers ── */
  function getSession()    { return _session; }
  function getUser()       { return _session?.user || null; }
  function getUsername()   { return _profile?.username || _session?.user?.user_metadata?.username || _session?.user?.email?.split('@')[0] || 'User'; }
  function getClient()     { return _supabase; }
  function isLoggedIn()    { return !!_session; }

  async function checkSession() {
    const { data } = await _supabase.auth.getSession();
    _session = data.session;
    if (_session?.user) await _loadProfile(_session.user.id);
    return _session;
  }

  /* ── JWT for Edge Function auth ── */
  function getAccessToken() {
    return _session?.access_token || null;
  }

  return { init, register, login, logout, getSession, getUser, getUsername, getClient, isLoggedIn, checkSession, getAccessToken };
})();
