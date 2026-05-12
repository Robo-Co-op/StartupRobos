#!/usr/bin/env bash
# StartupRobos — AI CXO Startup Platform
# Usage: bash <(curl -sL https://raw.githubusercontent.com/Robo-Co-op/StartupRobos/main/start.sh)

set -euo pipefail

echo ""
echo "  StartupRobos — AI CXO Startup Platform"
echo "  ========================================"
echo ""

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
  echo "  Install: npm install -g @anthropic-ai/claude-code"
  echo ""
  read -r -p "  Install now? (y/n): " install_cc
  if [[ "$install_cc" == "y" || "$install_cc" == "Y" ]]; then
    npm install -g @anthropic-ai/claude-code
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
# 4. Prompt for required credentials
# ---------------------------------------------------------------------------
echo ""
echo "  Enter your credentials:"
echo ""

read -r -p "  Supabase URL: " SUPABASE_URL
read -r -p "  Supabase Anon Key: " SUPABASE_ANON_KEY
read -r -p "  Supabase Service Role Key: " SERVICE_ROLE_KEY
read -r -p "  Anthropic API Key: " ANTHROPIC_API_KEY

# ---------------------------------------------------------------------------
# 5. Generate CRON_SECRET
# ---------------------------------------------------------------------------
if command -v openssl &>/dev/null; then
  CRON_SECRET=$(openssl rand -hex 32)
else
  CRON_SECRET=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")
fi

# ---------------------------------------------------------------------------
# 6. Write .env.local
# ---------------------------------------------------------------------------
ENV_FILE="$TARGET_DIR/.env.local"

cat > "$ENV_FILE" <<ENV
NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY
CRON_SECRET=$CRON_SECRET
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
