#!/bin/bash
set -e

SKILL_BASE="$HOME/.claude/skills"

# --- Playwright skill ---
PLAYWRIGHT_SKILL="$SKILL_BASE/playwright-skill"
mkdir -p "$PLAYWRIGHT_SKILL/lib"

BASE_URL="https://raw.githubusercontent.com/lackeyjb/playwright-skill/main/skills/playwright-skill"
curl -fsSL "$BASE_URL/SKILL.md"         -o "$PLAYWRIGHT_SKILL/SKILL.md"
curl -fsSL "$BASE_URL/package.json"     -o "$PLAYWRIGHT_SKILL/package.json"
curl -fsSL "$BASE_URL/run.js"           -o "$PLAYWRIGHT_SKILL/run.js"
curl -fsSL "$BASE_URL/API_REFERENCE.md" -o "$PLAYWRIGHT_SKILL/API_REFERENCE.md"
curl -fsSL "$BASE_URL/lib/helpers.js"   -o "$PLAYWRIGHT_SKILL/lib/helpers.js"

cd "$PLAYWRIGHT_SKILL"
npm install
npx playwright install chromium --with-deps
echo "Playwright skill installed"

# --- Frontend design skill ---
FRONTEND_SKILL="$SKILL_BASE/frontend-design"
mkdir -p "$FRONTEND_SKILL"
curl -fsSL "https://raw.githubusercontent.com/anthropics/claude-code/main/plugins/frontend-design/skills/frontend-design/SKILL.md"      -o "$FRONTEND_SKILL/SKILL.md"
echo "Frontend design skill installed"
