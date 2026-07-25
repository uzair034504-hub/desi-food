# Dastarkhwan AI — Real Backend + Frontend

A real, working chatbot: **Python (FastAPI) backend** + **React frontend**, powered by
**Groq** for fast LLM + vision inference. No no-code tools, no vendor lock-in — plain
code you fully control, that you can host anywhere (your own VPS, Railway, Render, etc).

## Features

- **Multi-provider AI** — uses **Groq** and **Hugging Face** together right now (both
  free), with automatic fallback: if the first provider fails or hits a rate limit, the
  next one is tried automatically. **Anthropic** is wired in and ready to activate the
  moment you add a paid key — no code changes needed, just add `ANTHROPIC_API_KEY`.
- **Broad recipe knowledge** — not limited to the handful of seed recipes in the
  database. The LLM answers ANY recipe/masala/sauce question using its general
  knowledge. The database is only a fast, verified shortcut for common items you've
  personally checked — not a limit on what the bot can answer.
- **Bilingual** — replies in whichever language style the user writes in (English or
  Roman Urdu/Hinglish), and can give both if explicitly asked.
- **Ingredient photo recognition** — upload a photo of what's in your fridge, a vision
  model identifies the ingredients, and the bot suggests what you can cook.
- **Nearby store finder** — tap the location pin, tell it which ingredient you're
  missing, and it uses your browser location + Google Places to show nearby stores.
- **Self-improving knowledge base** — every question the LLM has to answer gets logged
  for review, so you can promote good answers into the permanent, verified database
  over time (this replaces risky/expensive reinforcement learning with a practical
  human-in-the-loop review queue).

## How the multi-provider system works

`backend/llm.py` reads `LLM_PROVIDER_ORDER` from your `.env` (default:
`groq,huggingface,anthropic`) and tries each provider in that order:

1. Skips any provider without an API key set — so leaving `ANTHROPIC_API_KEY` blank
   simply means it's skipped, no errors.
2. If a configured provider's request fails (network error, rate limit, bad response),
   it logs the failure and moves to the next provider in the list.
3. Returns the first successful answer.

To add Anthropic later: just add `ANTHROPIC_API_KEY=sk-ant-...` to `backend/.env` —
that's it, it joins the rotation automatically based on its position in
`LLM_PROVIDER_ORDER`. Want Anthropic to be tried FIRST once you're paying for it?
Just reorder the env var: `LLM_PROVIDER_ORDER=anthropic,groq,huggingface`.

Each provider lives in its own file under `backend/providers/` — adding a new one
later (OpenAI, Gemini, etc.) means copying the pattern in `groq_provider.py`:
an `is_configured()` check and a `chat(messages)` function.

## Architecture

```
Browser (React)  <-- REST API -->  FastAPI backend (Python)  <-->  Postgres
                                          |
                                          v
                                   Groq (LLM + Vision)
                                          |
                                          v
                                Google Places (store locator)
```

1. User sends a message (text or ingredient photo) from the chat UI.
2. **Text question** -> backend checks `recipes` / `masalas` / `sauces` tables first
   (instant, free, verified). If nothing matches, Groq's LLM answers broadly.
3. **Photo upload** -> Groq's vision model identifies ingredients in the photo, cross-
   checks them against the verified database, and Groq's LLM suggests dishes to cook.
4. **Missing ingredient** -> tap the location button, and Google Places finds nearby
   grocery stores using the browser's GPS location.
5. Any LLM-generated answer is logged to `pending_reviews` for later human review and
   promotion into the permanent knowledge base.

## Project structure

```
backend/
  main.py          -> FastAPI app, all API routes
  db.py             -> Postgres queries (plain psycopg2, no ORM)
  llm.py            -> Hugging Face LLM call
  formatters.py     -> turns DB rows into readable chat answers
  schema.sql         -> run once in your Postgres database
  requirements.txt
  .env.example
src/
  lib/api.ts        -> talks to the FastAPI backend (fetch calls)
  lib/types.ts
  components/       -> Sidebar, ChatWindow, MessageBubble, InputBar
  App.tsx
```

## Setup

### 1. Database

You can use Supabase's Postgres (just as a database now, not its Auth/Edge Functions)
or any Postgres — Railway, Render, a VPS, doesn't matter.

- Get your Postgres connection string (`postgresql://user:pass@host:5432/dbname`)
- Run `backend/schema.sql` against it once (Supabase: SQL Editor -> paste -> Run;
  otherwise: `psql your_connection_string -f backend/schema.sql`)

### 2. Backend setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt

cp .env.example .env
# edit .env: fill in DATABASE_URL, GROQ_API_KEY, and HF_API_KEY

uvicorn main:app --reload --port 8000
```

Backend now runs at `http://localhost:8000`. Test it: open
`http://localhost:8000/api/health` in your browser — should return `{"status":"ok"}`.

### 3. Get your free API keys

**Groq** (primary — fast, generous free tier):
1. https://console.groq.com/keys → create a key (starts with `gsk_...`)
2. Put it in `backend/.env` as `GROQ_API_KEY`

**Hugging Face** (backup — used automatically if Groq fails or hits a limit):
1. https://huggingface.co/settings/tokens → create a token with
   "Make calls to Inference Providers" permission
2. Put it in `backend/.env` as `HF_API_KEY`

**Anthropic** (add later, once you have paid credits):
Leave `ANTHROPIC_API_KEY` blank for now — the system automatically skips it until
you add a key. When you're ready: https://console.anthropic.com/settings/keys,
then just paste the key into `.env`. No code changes needed.

### 4. (Optional) Get a Google Places API key — for the nearby-store feature

1. Go to https://console.cloud.google.com/google/maps-apis/credentials
2. Create a project (if you don't have one), enable **"Places API (New)"**
3. Create an API key, restrict it to the Places API for security
4. Put it in `backend/.env` as `GOOGLE_PLACES_API_KEY`

If you skip this, everything else still works — the store-finder button will just
return an empty result.

### 5. Frontend setup

```bash
# from the project root
npm install
cp .env.example .env
# .env should have: VITE_API_URL=http://localhost:8000

npm run dev
```

Open the printed localhost URL. Chat away.

## Growing the knowledge base

Check the `pending_reviews` table (via `psql`, a DB GUI like TablePlus/pgAdmin, or
Supabase's Table Editor if you're using their Postgres) for every question the LLM
had to answer. Once verified, insert a proper row into `recipes` / `masalas` / `sauces`
with `is_verified = true`. Next time someone asks the same question, it's answered
instantly from your own data — zero LLM cost.

## Deploying for real use

- **Backend**: Railway, Render, Fly.io, or any VPS. Set the same env vars there.
  Update `ALLOWED_ORIGINS` to your real frontend domain.
- **Frontend**: Vercel, Netlify, or your own server. Set `VITE_API_URL` to your
  deployed backend's URL.
- **Database**: whatever Postgres you're already using.

## Next steps to extend this

- **Pricing on the store finder**: Google Places doesn't reliably return live grocery
  prices anywhere in the world — the current implementation shows store names,
  addresses, ratings, and open/closed status only. Adding price estimates would need
  a region-specific data source you maintain yourself.
- **Better search**: swap the simple `LIKE` matching in `db.py` for Postgres full-text
  search or pgvector embeddings once your recipe count grows past a few hundred.
- **Admin review page**: a small authenticated React page listing `pending_reviews`
  with Approve/Reject buttons that insert directly into the verified tables.
- **Streaming responses**: switch `/api/chat` to a streaming response
  (`StreamingResponse` in FastAPI) so the chat types out word-by-word like ChatGPT.
- **Replace `window.prompt()`**: the nearby-store button currently uses a plain
  browser prompt for the ingredient name — swap this for a proper modal/input field
  for a more polished feel.
