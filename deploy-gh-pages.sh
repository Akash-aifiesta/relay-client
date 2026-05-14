#!/usr/bin/env bash
# Deploy the standalone client to GitHub Pages.
# No environment variables needed — the API URL is set at runtime via the UI.
#
# Usage:
#   ./deploy-gh-pages.sh
#   npm run deploy
#
# Prerequisites:
#   npm install  (installs gh-pages locally)
#   git remote named "origin" pointing at your GitHub repo

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Detect repo name for GitHub Pages base path ──────────────────────────────
# GitHub Pages serves project repos at https://<user>.github.io/<repo>/
# Vite needs base="/<repo>/" so asset paths resolve correctly.
REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
REPO_NAME=$(basename -s .git "$REMOTE_URL" 2>/dev/null || echo "")
GH_USER=$(echo "$REMOTE_URL" | sed 's/.*github.com[:/]\([^/]*\)\/.*/\1/' 2>/dev/null || echo "")

# If repo is <user>.github.io itself, base is "/"; otherwise "/<repo>/"
if [[ -z "$REPO_NAME" || "$REPO_NAME" == "${GH_USER}.github.io" ]]; then
  BASE="/"
else
  BASE="/$REPO_NAME/"
fi

echo "▶ Building with base path: $BASE"
npm run build -- --base "$BASE"

echo "▶ Deploying dist/ → gh-pages branch…"
npx gh-pages --dist dist --branch gh-pages --message "deploy: $(date -u +%Y-%m-%dT%H:%M:%SZ)"

PAGES_URL="https://${GH_USER}.github.io${BASE}"
echo ""
echo "✓ Done."
echo "  Live at: $PAGES_URL"
echo ""
echo "  First visit: click 'Change API URL' in the sidebar and set your backend URL."
