# StartupRobos

AI CXO team that runs digital businesses for you. Just talk.

> **Formerly: Launchpad.** Same codebase, new name. The `/dashboard` UI still reads "Launchpad" — renaming is in progress.

---

## 🚨 Read this first — architectural model

**StartupRobos is a framework, not a template for a single business.**

- If you want to **run businesses for yourself**: click **"Use this template"** on GitHub (NOT fork). Your businesses live inside *your* instance.
- If you want to **build a new business** (e.g. Robo Match, OpenCareers) that leverages the CxO multi-agent pattern: create your StartupRobos instance first, then add the business under `businesses/<slug>/` inside that instance. **Do NOT copy `.claude/agents/`, `AGENTS.md`, or `src/lib/agent/` into a standalone repo.** You will waste weeks and lose future upstream improvements.

**Rule of thumb:** one StartupRobos instance = one operator = N businesses run by the shared CxO team.

```
❌ Wrong:   robo-match-standalone-repo (re-implements CxO prompts)
✅ Right:   my-startuprobos/businesses/robo-match/  (uses shared CxOs)
```

### Why "Use this template" instead of fork?

| | Template clone | Fork |
|--|---------------|------|
| Setup scripts run cleanly | ✅ | ⚠️ references remain |
| History is yours | ✅ | ❌ (carries upstream history) |
| Can pull upstream fixes later | ✅ `git remote add upstream …` | ✅ |
| GitHub default branch flexible | ✅ | ⚠️ |

The OpenFisca project (our design inspiration) learned this the hard way and [explicitly warns against forking](https://github.com/openfisca/country-template).

---

## Start (for operators)

```bash
# 1. On GitHub: click "Use this template" on Robo-Co-op/StartupRobos
#    → creates YOUR_USERNAME/<your-instance-name>
# 2. Clone your new instance:
git clone https://github.com/YOUR_USERNAME/<your-instance-name>.git
cd <your-instance-name>
npm install

# 3. Run the init script — sets up .env, picks businesses, writes README:
bash scripts/init-operator.sh

# 4. Launch Claude Code:
claude
```

Claude Code opens and asks what languages you speak. The CEO (Opus) picks 3 businesses. CxO agents (Sonnet) build and run them. You check in when you want.

## Default businesses (all $0 to start)

| Type | What | Revenue |
|------|------|---------|
| Affiliate/SEO | Multi-language review sites | Affiliate commissions |
| Digital Products | Templates, ebooks on Gumroad | Direct sales |
| Games + Ads | HTML5 games with AdSense | Ad revenue |

New business types can be added by the CEO agent or proposed by the operator. They live under `businesses/` in your instance. See `businesses/_template/README.md` for the convention.

## Requirements

- [Claude Code](https://claude.ai/download) (`npm i -g @anthropic-ai/claude-code`)
- Anthropic API key ([console.anthropic.com](https://console.anthropic.com/))
- GitHub account
- Free tier works for: Supabase, Vercel, Gumroad

## How it works

StartupRobos is a Claude Code configuration + Next.js Mission Control dashboard. Open Claude Code in your instance → it becomes your coordinator → delegates to CEO (Opus) for strategy → CEO delegates to CTO/CMO/COO/CFO (Sonnet) for execution.

```
AI: "How should I call you?"
You: "Ahmed"
AI: "Hi Ahmed! Which languages do you speak?" → pick from list
AI: "Where do you live?" → pick from list
AI: "Here are 3 businesses I recommend..."
You: "Let's go"
AI: → delegates to CTO, CMO, COO, CFO → they start building
```

Daily heartbeats (Vercel Cron) keep agents running even when you're not at the keyboard. Reports go to the operator by email. Mission Control dashboard at `/dashboard` shows everything live.

## Budget

$500/month runs 3 businesses in parallel.

| Role | Model | ~Cost |
|------|-------|-------|
| Coordinator (main) | Sonnet | $150/mo |
| CEO (strategy) | Opus | $30/mo |
| CXOs (execution) | Sonnet | $200/mo |
| Research | Haiku | $70/mo |

With prompt caching enabled (configured in `.claude/` + `src/lib/agent/`), expect ~40% lower effective cost.

---

## Full Setup (manual — if you skipped `init-operator.sh`)

### 1. Create your instance

```bash
# Click "Use this template" on Robo-Co-op/StartupRobos, then:
git clone https://github.com/YOUR_USERNAME/<your-instance-name>.git
cd <your-instance-name>
npm install
```

### 2. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. **SQL Editor** → paste contents of `supabase/schema.sql` → **Run**
3. **SQL Editor** → paste contents of `supabase/migrations/001_spend_budget_rpc.sql` → **Run**
4. **Settings > API** → copy Project URL, anon key, service role key

### 3. Environment

```bash
cp .env.example .env.local
# Edit .env.local with your Supabase keys + Anthropic API key + secrets
# Generate API_SECRET: openssl rand -hex 32
# Generate CRON_SECRET: openssl rand -hex 32
```

### 4. Deploy to Vercel

```bash
npx vercel          # Link to your Vercel project
npx vercel env add  # Add each key from .env.local (for production)
npx vercel --prod   # Deploy
```

### 5. Start operating

```bash
claude   # in the project directory
# AI will guide you through onboarding
```

---

## Adding a new business (for contributors)

**If you are a CXO agent building a new business inside a StartupRobos instance:**

1. Copy `businesses/_template/` to `businesses/<your-business-slug>/`
2. Fill in `businesses/<your-business-slug>/README.md` following the template
3. Use the existing CxO pattern from `src/lib/agent/` — do **not** duplicate it
4. Register the business type in `src/lib/dashboard/queries.ts` if new agent task types are introduced
5. Update `memory/MEMORY.md` with the business context

**Do not create a standalone repo for a single business.** A business is not a framework.

## Staying up to date with upstream

```bash
git remote add upstream https://github.com/Robo-Co-op/StartupRobos.git
git fetch upstream
git merge upstream/main          # pull framework improvements
```

## License

MIT — template freely. Upstream improvements welcome.
