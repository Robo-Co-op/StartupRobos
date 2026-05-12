#!/usr/bin/env bats
# TDD tests for start.sh

SCRIPT_DIR="$(cd "$(dirname "$BATS_TEST_FILENAME")/../.." && pwd)"
START_SH="$SCRIPT_DIR/start.sh"

# Save original PATH for setup
ORIG_PATH="$PATH"

setup() {
  # Create fake PATH directories before tests
  mkdir -p /tmp/fake-path-no-git
  mkdir -p /tmp/fake-path-no-node
  mkdir -p /tmp/fake-path-no-npm

  # Get real tool locations
  REAL_GIT="$(which git)"
  REAL_NODE="$(which node)"
  REAL_NPM="$(which npm)"
  REAL_BASH="$(which bash)"

  # Setup fake-path-no-git (has node, npm, bash but not git)
  ln -sf "$REAL_NODE" /tmp/fake-path-no-git/node 2>/dev/null || true
  ln -sf "$REAL_NPM" /tmp/fake-path-no-git/npm 2>/dev/null || true
  ln -sf "$REAL_BASH" /tmp/fake-path-no-git/bash 2>/dev/null || true

  # Setup fake-path-no-node (has git, npm, bash but not node)
  ln -sf "$REAL_GIT" /tmp/fake-path-no-node/git 2>/dev/null || true
  ln -sf "$REAL_NPM" /tmp/fake-path-no-node/npm 2>/dev/null || true
  ln -sf "$REAL_BASH" /tmp/fake-path-no-node/bash 2>/dev/null || true

  # Setup fake-path-no-npm (has git, node, bash but not npm)
  ln -sf "$REAL_GIT" /tmp/fake-path-no-npm/git 2>/dev/null || true
  ln -sf "$REAL_NODE" /tmp/fake-path-no-npm/node 2>/dev/null || true
  ln -sf "$REAL_BASH" /tmp/fake-path-no-npm/bash 2>/dev/null || true
}

# =============================================================================
# Slice 1: Prereq check (git, node, npm)
# =============================================================================

@test "exits 1 when git is missing" {
  export PATH="/tmp/fake-path-no-git"

  run bash "$START_SH"

  [ "$status" -eq 1 ]
  [[ "$output" == *"git"* ]]
}

@test "exits 1 when node is missing" {
  export PATH="/tmp/fake-path-no-node"

  run bash "$START_SH"

  [ "$status" -eq 1 ]
  [[ "$output" == *"node"* ]]
}

@test "exits 1 when npm is missing" {
  export PATH="/tmp/fake-path-no-npm"

  run bash "$START_SH"

  [ "$status" -eq 1 ]
  [[ "$output" == *"npm"* ]]
}

# =============================================================================
# Slice 2: Claude CLI check + install offer
# =============================================================================

@test "offers to install claude when missing" {
  # Create PATH with prereqs but no claude
  mkdir -p /tmp/fake-path-no-claude
  ln -sf "$(which git)" /tmp/fake-path-no-claude/git
  ln -sf "$(which node)" /tmp/fake-path-no-claude/node
  ln -sf "$(which npm)" /tmp/fake-path-no-claude/npm
  ln -sf "$(which bash)" /tmp/fake-path-no-claude/bash

  export PATH="/tmp/fake-path-no-claude"

  # Provide 'n' to decline install, via /dev/tty simulation
  run bash "$START_SH" <<< "n"

  [[ "$output" == *"Claude Code"* ]]
  [[ "$output" == *"Install"* ]] || [[ "$output" == *"install"* ]]
}

@test "exits 1 when claude missing and user declines install" {
  mkdir -p /tmp/fake-path-no-claude
  ln -sf "$(which git)" /tmp/fake-path-no-claude/git
  ln -sf "$(which node)" /tmp/fake-path-no-claude/node
  ln -sf "$(which npm)" /tmp/fake-path-no-claude/npm
  ln -sf "$(which bash)" /tmp/fake-path-no-claude/bash

  export PATH="/tmp/fake-path-no-claude"

  # Provide 'n' to decline install
  run bash "$START_SH" <<< "n"

  [ "$status" -eq 1 ]
}

# =============================================================================
# Slice 3: Clone StartupRobos (skip if exists)
# =============================================================================

@test "skips clone if StartupRobos directory exists" {
  # Create temp working directory with pre-existing StartupRobos FIRST (before PATH change)
  TEST_DIR="/tmp/test-clone-skip-$$"
  mkdir -p "$TEST_DIR/StartupRobos"

  # Setup fake PATH with all needed tools
  mkdir -p /tmp/fake-path-with-claude
  ln -sf "$(which git)" /tmp/fake-path-with-claude/git
  ln -sf "$(which node)" /tmp/fake-path-with-claude/node
  ln -sf "$(which npm)" /tmp/fake-path-with-claude/npm
  ln -sf "$(which bash)" /tmp/fake-path-with-claude/bash

  # Create fake claude that exits 0
  cat > /tmp/fake-path-with-claude/claude <<'FAKECLAUDE'
#!/bin/bash
exit 0
FAKECLAUDE
  chmod +x /tmp/fake-path-with-claude/claude

  export PATH="/tmp/fake-path-with-claude"

  cd "$TEST_DIR"

  # Run script - should skip clone
  run bash "$START_SH" <<< ""

  [[ "$output" == *"already exists"* ]] || [[ "$output" == *"skipping"* ]]

  # Cleanup (use absolute path since rm might not be in fake PATH)
  /bin/rm -rf "$TEST_DIR"
}

# =============================================================================
# Slice 4: Prompt 4 required vars + write .env.local (with CRON_SECRET)
# =============================================================================

@test ".env.local contains all 5 required keys" {
  # Create temp working directory with pre-existing StartupRobos
  TEST_DIR="/tmp/test-env-local-$$"
  mkdir -p "$TEST_DIR/StartupRobos"

  # Setup fake PATH with all needed tools (include cat for heredoc in script)
  mkdir -p /tmp/fake-path-env-test
  ln -sf "$(which git)" /tmp/fake-path-env-test/git
  ln -sf "$(which node)" /tmp/fake-path-env-test/node
  ln -sf "$(which npm)" /tmp/fake-path-env-test/npm
  ln -sf "$(which bash)" /tmp/fake-path-env-test/bash
  ln -sf "$(which openssl)" /tmp/fake-path-env-test/openssl 2>/dev/null || true
  ln -sf "$(which cat)" /tmp/fake-path-env-test/cat 2>/dev/null || true

  # Create fake claude that exits 0
  cat > /tmp/fake-path-env-test/claude <<'FAKECLAUDE'
#!/bin/bash
exit 0
FAKECLAUDE
  chmod +x /tmp/fake-path-env-test/claude

  export PATH="/tmp/fake-path-env-test"

  cd "$TEST_DIR"

  # Provide 4 required inputs (Supabase URL, Anon Key, Service Role Key, Anthropic API Key)
  run bash "$START_SH" <<EOF
https://test.supabase.co
test-anon-key-123
test-service-role-key-456
sk-ant-test-api-key-789
EOF

  # Restore PATH for grep checks
  export PATH="$ORIG_PATH"

  # Check .env.local was created with all 5 keys
  [ -f "$TEST_DIR/StartupRobos/.env.local" ]
  /bin/grep -q "NEXT_PUBLIC_SUPABASE_URL=" "$TEST_DIR/StartupRobos/.env.local"
  /bin/grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" "$TEST_DIR/StartupRobos/.env.local"
  /bin/grep -q "SUPABASE_SERVICE_ROLE_KEY=" "$TEST_DIR/StartupRobos/.env.local"
  /bin/grep -q "ANTHROPIC_API_KEY=" "$TEST_DIR/StartupRobos/.env.local"
  /bin/grep -q "CRON_SECRET=" "$TEST_DIR/StartupRobos/.env.local"

  # Cleanup
  /bin/rm -rf "$TEST_DIR"
}

# =============================================================================
# Slice 5: npm install
# =============================================================================

@test "runs npm install in StartupRobos directory" {
  # Create temp working directory with pre-existing StartupRobos
  TEST_DIR="/tmp/test-npm-install-$$"
  mkdir -p "$TEST_DIR/StartupRobos"

  # Setup fake PATH with mock npm that logs calls
  mkdir -p /tmp/fake-path-npm-test
  ln -sf "$(which git)" /tmp/fake-path-npm-test/git
  ln -sf "$(which node)" /tmp/fake-path-npm-test/node
  ln -sf "$(which bash)" /tmp/fake-path-npm-test/bash
  ln -sf "$(which openssl)" /tmp/fake-path-npm-test/openssl 2>/dev/null || true
  ln -sf "$(which cat)" /tmp/fake-path-npm-test/cat 2>/dev/null || true

  # Create mock npm that logs calls
  cat > /tmp/fake-path-npm-test/npm <<'FAKENPM'
#!/bin/bash
echo "NPM_CALLED: $@" >> /tmp/npm_calls.log
exit 0
FAKENPM
  chmod +x /tmp/fake-path-npm-test/npm

  # Create fake claude that exits 0
  cat > /tmp/fake-path-npm-test/claude <<'FAKECLAUDE'
#!/bin/bash
exit 0
FAKECLAUDE
  chmod +x /tmp/fake-path-npm-test/claude

  # Clear log
  rm -f /tmp/npm_calls.log

  export PATH="/tmp/fake-path-npm-test"

  cd "$TEST_DIR"

  # Provide 4 required inputs
  run bash "$START_SH" <<EOF
https://test.supabase.co
test-anon-key-123
test-service-role-key-456
sk-ant-test-api-key-789
EOF

  # Check npm install was called
  [ -f /tmp/npm_calls.log ]
  /bin/grep -q "install" /tmp/npm_calls.log

  # Cleanup
  /bin/rm -rf "$TEST_DIR" /tmp/npm_calls.log
}

# =============================================================================
# Slice 6: Launch claude
# =============================================================================

@test "outputs 'Launching Claude Code' and calls claude" {
  # Create temp working directory with pre-existing StartupRobos
  TEST_DIR="/tmp/test-launch-$$"
  mkdir -p "$TEST_DIR/StartupRobos"

  # Setup fake PATH
  mkdir -p /tmp/fake-path-launch-test
  ln -sf "$(which git)" /tmp/fake-path-launch-test/git
  ln -sf "$(which node)" /tmp/fake-path-launch-test/node
  ln -sf "$(which bash)" /tmp/fake-path-launch-test/bash
  ln -sf "$(which openssl)" /tmp/fake-path-launch-test/openssl 2>/dev/null || true
  ln -sf "$(which cat)" /tmp/fake-path-launch-test/cat 2>/dev/null || true

  # Mock npm
  cat > /tmp/fake-path-launch-test/npm <<'FAKENPM'
#!/bin/bash
exit 0
FAKENPM
  chmod +x /tmp/fake-path-launch-test/npm

  # Mock claude that logs when called
  cat > /tmp/fake-path-launch-test/claude <<'FAKECLAUDE'
#!/bin/bash
echo "CLAUDE_LAUNCHED" >> /tmp/claude_calls.log
exit 0
FAKECLAUDE
  chmod +x /tmp/fake-path-launch-test/claude

  rm -f /tmp/claude_calls.log

  export PATH="/tmp/fake-path-launch-test"

  cd "$TEST_DIR"

  # Provide inputs
  run bash "$START_SH" <<EOF
https://test.supabase.co
test-anon-key-123
test-service-role-key-456
sk-ant-test-api-key-789
EOF

  # Check output contains launch message
  [[ "$output" == *"Launching Claude Code"* ]]

  # Check claude was called
  [ -f /tmp/claude_calls.log ]

  # Cleanup
  /bin/rm -rf "$TEST_DIR" /tmp/claude_calls.log
}
