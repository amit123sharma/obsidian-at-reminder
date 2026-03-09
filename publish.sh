#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Publish @ Reminder Plugin to GitHub & Obsidian
# Run: chmod +x publish.sh && ./publish.sh
# ═══════════════════════════════════════════════════════════

set -e

echo "📦 Step 1: Installing GitHub CLI..."
brew install gh 2>/dev/null || echo "gh already installed"

echo ""
echo "🔑 Step 2: Authenticating with GitHub..."
echo "   (This will open a browser window to log in)"
gh auth login --hostname github.com --git-protocol https --web

echo ""
echo "📁 Step 3: Creating GitHub repository..."
gh repo create obsidian-at-reminder \
  --public \
  --description "Obsidian plugin: Set reminders via Cmd+Shift+R, /remind, or right-click. macOS native notifications with side panel tracker." \
  --source . \
  --remote origin \
  --push

echo ""
echo "🏷️  Step 4: Building production version..."
npm run build

echo ""
echo "🏷️  Step 5: Creating release tag..."
git tag 1.0.0
git push origin 1.0.0

echo ""
echo "📤 Step 6: Creating GitHub Release with assets..."
gh release create 1.0.0 \
  main.js \
  manifest.json \
  styles.css \
  --title "v1.0.0 - Initial Release" \
  --notes "## ⏰ @ Reminder for Obsidian

### Features
- **Cmd+Shift+R** — Quick add reminder from anywhere
- **/remind** — Slash command in editor
- **Right-click** — Context menu to set reminder
- **Command Palette** — Search 'Add new reminder'
- **Side panel** — Track all reminders sorted ascending
- **macOS notifications** — via terminal-notifier with Obsidian icon
- **Optional description** — Add extra context to reminders
- **Quick presets** — 15min, 1hr, 3hr, Tomorrow 9am, Next Monday 9am
- **Click notification** → Opens Obsidian and navigates to the note

### Requirements
- macOS (uses terminal-notifier for notifications)
- Obsidian v1.0.0+
- Install terminal-notifier: \`brew install terminal-notifier\`
"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ DONE! Your plugin is published at:"
echo "   https://github.com/amit123sharma/obsidian-at-reminder"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 NEXT STEP: Submit to Obsidian Community Plugins"
echo "   Run this command to fork and create the PR:"
echo ""
echo "   gh repo fork obsidianmd/obsidian-releases --clone"
echo "   cd obsidian-releases"
echo ""
echo "   Then add this entry to community-plugins.json:"
echo '   {'
echo '     "id": "at-reminder",'
echo '     "name": "@ Reminder",'
echo '     "author": "Amit Sharma",'
echo '     "description": "Set reminders via Cmd+Shift+R, /remind, or right-click. macOS native notifications with side panel tracker.",'
echo '     "repo": "amit123sharma/obsidian-at-reminder"'
echo '   }'
echo ""
echo "   Then commit and create a PR:"
echo "   git add community-plugins.json"
echo '   git commit -m "Add @ Reminder plugin"'
echo "   gh pr create --title 'Add @ Reminder plugin' --body 'Plugin submission for at-reminder'"
echo ""
