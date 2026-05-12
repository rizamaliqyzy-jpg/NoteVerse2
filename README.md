# 🪔 NoteVerse v2

> Pixar-inspired note-taking with **real security** (Supabase Auth + RLS) and a **genuinely deep AI** study partner.

---

## What's new in v2

| Feature | v1 | v2 |
|---|---|---|
| Auth | `btoa()` in localStorage ❌ | Supabase Auth (bcrypt server-side) ✅ |
| Notes storage | localStorage only | Supabase Postgres + localStorage fallback |
| API key security | Exposed in client code ❌ | Supabase Edge Function proxy ✅ |
| JWT validation | None | Every AI call validates your login token |
| Rate limiting | None | 20 req/min per user, enforced server-side |
| AI quality | Generic summaries | Deep critical thinking, Socratic questions, real sources |
| Quiz | 3 basic questions | 5 questions: recall + application + synthesis, with explanations |
| AI actions | Quiz, Articles, Summary | + **Challenge my thinking** (devil's advocate critique) |

---

## Setup in 4 steps (~15 minutes)

### Step 1 — Create a Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is fine)
2. Note your **Project URL** and **anon public key** from `Project Settings → API`

### Step 2 — Run the database schema

1. In your Supabase dashboard, go to **SQL Editor → New query**
2. Paste the contents of `supabase/schema.sql` and click **Run**

This creates:
- `profiles` table — stores display names
- `notes` table — stores all notes
- Row Level Security policies — users can only access their own data
- Triggers — auto-create profile on signup, auto-update `updated_at`

### Step 3 — Deploy the Edge Function (secure API proxy)

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you haven't:

```bash
npm install -g supabase
```

Then link your project and deploy:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy claude-proxy
```

Set your Anthropic API key as a secret (never committed to git):

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_KEY_HERE
```

Get your API key at [console.anthropic.com](https://console.anthropic.com).

### Step 4 — Configure `js/config.js`

Open `js/config.js` and fill in your values:

```js
const CONFIG = {
  SUPABASE_URL:      'https://abcdefghij.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  CLAUDE_PROXY_URL:  'https://abcdefghij.supabase.co/functions/v1/claude-proxy',
};
```

Both the URL and anon key are **safe to commit** — they're public by design. The Supabase RLS policies ensure users can only access their own data.

---

## Deploy to GitHub Pages

```bash
git init
git add .
git commit -m "NoteVerse v2 — secure & deep AI"
git branch -M main
git remote add origin https://github.com/YOU/noteverse.git
git push -u origin main
```

Then: **Repo → Settings → Pages → Source: main / root**

Your site will be live at `https://YOU.github.io/noteverse/`

---

## Security architecture

```
Browser                  Supabase Edge Function           Anthropic
  │                              │                            │
  │  POST /claude-proxy          │                            │
  │  Authorization: Bearer JWT ──►  1. Validate JWT           │
  │                              │  2. Check rate limit       │
  │                              │  3. Sanitize body          │
  │                              │  4. Inject API key ────────►
  │                              │                            │
  │  ◄─────────────────────────────── Response ◄──────────────
```

- Your Anthropic API key **never touches the browser**
- Every request proves the user is logged in (JWT validation)
- Rate limiting prevents abuse (20 req/min per user)
- Model is locked server-side — clients can't switch to cheaper/different models
- RLS ensures user A can never read user B's notes even with a valid token

---

## Project structure

```
noteverse/
├── index.html                          # App shell
├── css/main.css                        # All styles
├── js/
│   ├── config.js                       # ← Fill in your Supabase values
│   ├── auth.js                         # Supabase Auth (register/login/JWT)
│   ├── notes.js                        # Supabase Postgres + localStorage fallback
│   ├── ai.js                           # Calls Edge Function with deep prompts
│   └── app.js                          # UI orchestration
└── supabase/
    ├── schema.sql                      # Run once in Supabase SQL Editor
    └── functions/
        └── claude-proxy/
            └── index.ts               # Edge Function — secure API proxy
```

---

## AI philosophy

NoteVerse AI v2 is designed to be a **rigorous intellectual sparring partner**, not a chatbot that echoes your notes back at you.

Every response:
- Is specific to your actual notes — never generic filler
- Connects ideas to broader disciplines and real-world applications
- Identifies gaps, assumptions, and counterarguments you haven't considered
- Ends with a Socratic question that pushes you deeper
- Uses Claude's web search tool for real sources (not hallucinated citations)

The quiz generates 5 questions at three cognitive levels (recall → application → synthesis) with explanations for why each answer is correct or wrong — so wrong answers teach as much as right ones.

---

## Local development

No build step needed.

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Open [http://localhost:8080](http://localhost:8080).

For the Edge Function locally:
```bash
supabase start
supabase functions serve claude-proxy
```

---

## License

MIT
