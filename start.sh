#!/usr/bin/env bash
# StartupRobos — AI CXO Startup Platform
# Usage: bash <(curl -sL https://raw.githubusercontent.com/Robo-Co-op/StartupRobos/main/start.sh)

set -euo pipefail

echo ""
echo "  StartupRobos — AI CXO Startup Platform"
echo "  ========================================"
echo ""

# ---------------------------------------------------------------------------
# Helper: Get value from env.staff (safe parsing, no sourcing)
# ---------------------------------------------------------------------------
get_staff_value() {
  local key="$1"
  if [ -f "env.staff" ]; then
    while IFS= read -r line || [[ -n "$line" ]]; do
      [[ -z "$line" ]] && continue
      [[ "$line" != *"="* ]] && continue
      local k="${line%%=*}"
      local v="${line#*=}"
      if [[ "$k" == "$key" ]]; then
        echo "$v"
        return
      fi
    done < "env.staff"
  fi
  echo ""
}

# ---------------------------------------------------------------------------
# Helper: Prompt with optional staff default
# ---------------------------------------------------------------------------
prompt_with_default() {
  local prompt_text="$1"
  local var_name="$2"
  local result=""
  local default_value
  default_value=$(get_staff_value "$var_name")

  if [[ -n "$default_value" ]]; then
    local masked="${default_value:0:8}..."
    echo -n "  $prompt_text (default: $masked): " >&2
  else
    echo -n "  $prompt_text: " >&2
  fi

  read -r result

  if [[ -z "$result" && -n "$default_value" ]]; then
    echo "$default_value"
  else
    echo "$result"
  fi
}

# ---------------------------------------------------------------------------
# Helper: Prompt for optional value (press Enter to skip)
# ---------------------------------------------------------------------------
prompt_optional() {
  local prompt_text="$1"
  local var_name="$2"
  local result=""
  local default_value
  default_value=$(get_staff_value "$var_name")

  if [[ -n "$default_value" ]]; then
    local masked="${default_value:0:8}..."
    echo -n "  $prompt_text (default: $masked, Enter to skip): " >&2
  else
    echo -n "  $prompt_text (press Enter to skip): " >&2
  fi

  read -r result

  if [[ -z "$result" && -n "$default_value" ]]; then
    echo "$default_value"
  else
    echo "$result"
  fi
}

# ---------------------------------------------------------------------------
# 1. Check required tools: git, node, npm
# ---------------------------------------------------------------------------
for cmd in git node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "  ERROR: Required tool not found: $cmd"
    echo "  Please install $cmd and try again."
    exit 1
  fi
done

# ---------------------------------------------------------------------------
# 2. Check for Claude Code CLI
# ---------------------------------------------------------------------------
if ! command -v claude &>/dev/null; then
  echo "  Claude Code CLI is required."
  echo "  Install: npm install -g @anthropic-ai/claude-code@1"
  echo ""
  read -r -p "  Install now? (y/n): " install_cc
  if [[ "$install_cc" == "y" || "$install_cc" == "Y" ]]; then
    npm install -g @anthropic-ai/claude-code@1
  else
    echo "  Please install Claude Code and try again."
    exit 1
  fi
fi

# ---------------------------------------------------------------------------
# 3. Clone StartupRobos (skip if already exists)
# ---------------------------------------------------------------------------
TARGET_DIR="StartupRobos"

if [ -d "$TARGET_DIR" ]; then
  echo "  $TARGET_DIR/ already exists — skipping clone."
else
  echo "  Cloning StartupRobos..."
  git clone --depth 1 https://github.com/Robo-Co-op/StartupRobos.git "$TARGET_DIR"
fi

# ---------------------------------------------------------------------------
# 3b. Install robobuilder to ~/.claude/plugins/
# ---------------------------------------------------------------------------
PLUGINS_DIR="$HOME/.claude/plugins"
ROBOBUILDER_DIR="$PLUGINS_DIR/robobuilder"

mkdir -p "$PLUGINS_DIR"

if [ -d "$ROBOBUILDER_DIR/.git" ]; then
  echo "  Updating robobuilder..."
  if ! git -C "$ROBOBUILDER_DIR" pull --ff-only 2>/dev/null; then
    echo "  Warning: robobuilder git pull failed (skipping update)"
  fi
else
  echo "  Installing robobuilder..."
  git clone --depth 1 https://github.com/Robo-Co-op/robobuilder.git "$ROBOBUILDER_DIR" || echo "  Warning: robobuilder clone failed"
fi

# ---------------------------------------------------------------------------
# 4. Prompt for required credentials
# ---------------------------------------------------------------------------
echo ""
echo "  Enter your credentials:"
echo ""

SUPABASE_URL=$(prompt_with_default "Supabase URL" "NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_ANON_KEY=$(prompt_with_default "Supabase Anon Key" "NEXT_PUBLIC_SUPABASE_ANON_KEY")
SERVICE_ROLE_KEY=$(prompt_with_default "Supabase Service Role Key" "SUPABASE_SERVICE_ROLE_KEY")
ANTHROPIC_API_KEY=$(prompt_with_default "Anthropic API Key" "ANTHROPIC_API_KEY")

# ---------------------------------------------------------------------------
# 4b. Prompt for optional credentials
# ---------------------------------------------------------------------------
echo ""
echo "  Optional credentials (press Enter to skip):"
echo ""

RESEND_API_KEY=$(prompt_optional "Resend API Key" "RESEND_API_KEY")
NOTIFY_EMAIL=$(prompt_optional "Notify Email" "NOTIFY_EMAIL")
UPSTASH_REDIS_REST_URL=$(prompt_optional "Upstash Redis REST URL" "UPSTASH_REDIS_REST_URL")
UPSTASH_REDIS_REST_TOKEN=$(prompt_optional "Upstash Redis REST Token" "UPSTASH_REDIS_REST_TOKEN")

# ---------------------------------------------------------------------------
# 5. Generate CRON_SECRET
# ---------------------------------------------------------------------------
if command -v openssl &>/dev/null; then
  CRON_SECRET=$(openssl rand -hex 32)
else
  CRON_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
fi

# ---------------------------------------------------------------------------
# 6. Backup existing .env.local and write new one
# ---------------------------------------------------------------------------
# Strip newlines to prevent heredoc injection attacks
SUPABASE_URL="${SUPABASE_URL//$'\n'/}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY//$'\n'/}"
SERVICE_ROLE_KEY="${SERVICE_ROLE_KEY//$'\n'/}"
ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY//$'\n'/}"
RESEND_API_KEY="${RESEND_API_KEY//$'\n'/}"
NOTIFY_EMAIL="${NOTIFY_EMAIL//$'\n'/}"
UPSTASH_REDIS_REST_URL="${UPSTASH_REDIS_REST_URL//$'\n'/}"
UPSTASH_REDIS_REST_TOKEN="${UPSTASH_REDIS_REST_TOKEN//$'\n'/}"

ENV_FILE="$TARGET_DIR/.env.local"

# Backup existing .env.local if it exists
if [ -f "$ENV_FILE" ]; then
  cp "$ENV_FILE" "$ENV_FILE.bak"
  echo "  Existing .env.local backed up to .env.local.bak"
fi

cat > "$ENV_FILE" <<ENV
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CRON_SECRET=$CRON_SECRET
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=$RESEND_API_KEY
NOTIFY_EMAIL=$NOTIFY_EMAIL
UPSTASH_REDIS_REST_URL=$UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN=$UPSTASH_REDIS_REST_TOKEN
ENV

echo ""
echo "  .env.local written."

# ---------------------------------------------------------------------------
# 7. npm install
# ---------------------------------------------------------------------------
echo "  Installing dependencies..."
npm install --prefix "$TARGET_DIR"

cd "$TARGET_DIR"

echo ""
echo "  ========================================"
echo "  Ready! Launching Claude Code..."
echo ""

exec claude
