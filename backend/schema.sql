-- ============================================================
-- Dastarkhwan AI — Postgres Schema (Python backend version)
-- Run this in your Postgres database (Supabase's Postgres works fine —
-- SQL Editor -> New Query -> paste -> Run). No Supabase Auth needed;
-- the Python backend manages its own simple user_id (a UUID generated
-- and stored in the browser, sent with every request).
-- ============================================================

create extension if not exists pg_trgm;
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ------------------------------------------------------------
-- 1. Core knowledge base
-- ------------------------------------------------------------

create table if not exists recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] default '{}',
  cuisine_region text,
  category text,
  ingredients jsonb not null,
  steps text[] not null,
  prep_time_minutes int,
  cook_time_minutes int,
  serves int,
  image_url text,
  is_verified boolean default true,
  created_at timestamptz default now()
);

create index if not exists recipes_name_trgm on recipes using gin (name gin_trgm_ops);

create table if not exists masalas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] default '{}',
  ingredients jsonb not null,
  method text not null,
  used_for text[],
  is_verified boolean default true,
  created_at timestamptz default now()
);

create table if not exists sauces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  aliases text[] default '{}',
  ingredients jsonb not null,
  steps text[] not null,
  pairs_with text[],
  is_verified boolean default true,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. Chat history (user_id is just a UUID string, not tied to Supabase Auth)
-- ------------------------------------------------------------

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text default 'New chat',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists conversations_user_idx on conversations(user_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  image_url text,
  source text default 'db',
  created_at timestamptz default now()
);

create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

-- ------------------------------------------------------------
-- 3. Feedback loop — replaces "RL", this is what actually works
-- ------------------------------------------------------------

create table if not exists pending_reviews (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  ai_generated_answer text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 4. Seed data
-- ------------------------------------------------------------

insert into recipes (name, aliases, cuisine_region, category, ingredients, steps, prep_time_minutes, cook_time_minutes, serves) values
(
  'Chicken Qeema',
  array['qeema', 'keema', 'minced chicken'],
  'Pakistani',
  'main',
  '[
    {"name":"chicken mince","qty":"500","unit":"g"},
    {"name":"onion","qty":"2","unit":"medium"},
    {"name":"tomato","qty":"2","unit":"medium"},
    {"name":"garlic paste","qty":"1","unit":"tbsp"},
    {"name":"ginger paste","qty":"1","unit":"tbsp"},
    {"name":"qourma masala","qty":"2","unit":"tbsp"},
    {"name":"oil","qty":"4","unit":"tbsp"}
  ]'::jsonb,
  array[
    'Onions ko golden brown hone tak fry karein.',
    'Ginger garlic paste dal ke 1 minute bhunain.',
    'Tomato dal ke gal jane tak paka lein.',
    'Qourma masala aur mince dal ke bhunain jab tak oil upar aaye.',
    'Paani dal ke dhak ke 15-20 minute dum par pakayein.'
  ],
  15, 30, 4
),
(
  'Zinger Burger Style Fried Chicken',
  array['zinger', 'fried chicken burger'],
  'Fast Food',
  'snack',
  '[
    {"name":"chicken breast fillet","qty":"2","unit":"pieces"},
    {"name":"flour","qty":"1","unit":"cup"},
    {"name":"cornflour","qty":"2","unit":"tbsp"},
    {"name":"egg","qty":"1","unit":"piece"},
    {"name":"chili powder","qty":"1","unit":"tsp"},
    {"name":"burger buns","qty":"2","unit":"pieces"}
  ]'::jsonb,
  array[
    'Fillet ko namak, mirch, aur ginger-garlic se marinate karein 30 min ke liye.',
    'Flour aur cornflour mix karein, egg wash lagayein, phir dobara flour mein coat karein.',
    'Medium-high heat par golden aur crispy hone tak fry karein.',
    'Bun mein mayo, lettuce, aur fried piece rakh ke serve karein.'
  ],
  30, 15, 2
)
on conflict do nothing;

insert into masalas (name, aliases, ingredients, method, used_for) values
(
  'Qourma Masala',
  array['korma masala', 'qorma masala'],
  '[
    {"name":"coriander seeds","qty":"3","unit":"tbsp"},
    {"name":"cumin seeds","qty":"1","unit":"tbsp"},
    {"name":"red chili whole","qty":"4-5","unit":"pieces"},
    {"name":"cinnamon stick","qty":"1","unit":"inch"},
    {"name":"cloves","qty":"4","unit":"pieces"},
    {"name":"green cardamom","qty":"3","unit":"pieces"},
    {"name":"black peppercorns","qty":"1","unit":"tsp"}
  ]'::jsonb,
  'Sab sabit masalon ko halki aanch par bhoon lein jab tak khushbu aaye, thanda karke barik pees lein. Airtight jar mein store karein.',
  array['Chicken Qeema', 'Chicken Qourma', 'Mutton Curry']
)
on conflict do nothing;

insert into sauces (name, aliases, ingredients, steps, pairs_with) values
(
  'Garlic Mayo Sauce',
  array['garlic mayonnaise', 'fries sauce'],
  '[
    {"name":"mayonnaise","qty":"1","unit":"cup"},
    {"name":"garlic paste","qty":"1","unit":"tbsp"},
    {"name":"lemon juice","qty":"1","unit":"tsp"},
    {"name":"black pepper","qty":"1/2","unit":"tsp"}
  ]'::jsonb,
  array['Sab ingredients ko achi tarah mix karein.', '30 minute fridge mein rakhein taake flavors mil jayein.'],
  array['fries', 'zinger burger', 'nuggets']
)
on conflict do nothing;
