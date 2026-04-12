#!/bin/bash
# Launchpad — AI CXO Startup Platform
# Usage: bash <(curl -sL https://raw.githubusercontent.com/Robo-Co-op/launchpad/main/start.sh)

set -e

echo ""
echo "  🚀 Launchpad — AI CXO Startup Platform"
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Claude Code チェック
if ! command -v claude &> /dev/null; then
  echo "  Claude Code is required. Install:"
  echo "  npm install -g @anthropic-ai/claude-code"
  echo ""
  if [ -t 0 ]; then
    read -p "  Install now? (y/n): " install_cc
    if [[ "$install_cc" == "y" || "$install_cc" == "Y" ]]; then
      npm install -g @anthropic-ai/claude-code
    else
      echo "  Please install Claude Code and try again."
      exit 1
    fi
  else
    echo "  Run: npm install -g @anthropic-ai/claude-code"
    exit 1
  fi
fi

# クローン先
dir_name="launchpad"

if [ -d "$dir_name" ]; then
  echo "  launchpad/ already exists. Entering that directory."
else
  echo "  Setting up Launchpad..."
  git clone --depth 1 https://github.com/Robo-Co-op/launchpad.git "$dir_name" 2>/dev/null
  rm -rf "$dir_name/.git"
  cd "$dir_name"
  git init -q
  git add -A
  git commit -q -m "Launchpad initial setup"
fi

cd "$dir_name" 2>/dev/null || true

echo ""
echo "  ✅ Ready!"
echo ""
echo "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Claude Code 起動（ターミナルから実行時のみ）
if [ -t 0 ]; then
  echo "  Starting Claude Code..."
  echo "  Just talk in your language. AI CXO team will build your businesses."
  echo ""
  claude
else
  echo "  Setup complete! Now open Claude Code in the launchpad/ folder."
fi
