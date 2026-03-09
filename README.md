# ⏰ @ Reminder — Obsidian Plugin

Never forget anything. Set reminders right from your notes and get native macOS notifications when they're due.

![Obsidian](https://img.shields.io/badge/Obsidian-v1.0+-purple) ![macOS](https://img.shields.io/badge/macOS-only-blue) ![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| ⌨️ **Cmd+Shift+R** | Quick-add a reminder from any note |
| 📝 **/remind** | Type `/remind` for a slash command dropdown |
| 🖱️ **Right-click** | Context menu → "Set reminder" |
| 🔔 **macOS Notifications** | Native banner with Obsidian icon + sound |
| 📋 **Side Panel** | Track all reminders sorted by time (ascending) |
| 📎 **Optional Details** | Add description/context to each reminder |
| ⚡ **Quick Presets** | 15min, 1hr, 3hr, Tomorrow 9am, Next Monday 9am |
| 🔗 **Click to Navigate** | Click notification → Opens Obsidian → Goes to the note |

---

## 🚀 Quick Start

### 1. Add a Reminder

**Keyboard shortcut (fastest):**
```
Press Cmd+Shift+R → Type message → Pick time → Done!
```

**Slash command:**
```
Type /remind in any note → Select "Set a new reminder"
```

**Right-click:**
```
Select text → Right-click → "⏰ Set reminder for 'selected text...'"
```

**Command Palette:**
```
Cmd+P → "Add new reminder"
```

### 2. Fill in the Modal

When the modal appears:

```
┌──────────────────────────────────┐
│ ⏰ New Reminder                  │
│                                  │
│ What to remind?                  │
│ [Review PR #42              ]    │
│                                  │
│ Details (optional)               │
│ [Check auth changes in the   ]   │
│ [feature-login branch        ]   │
│                                  │
│ Date          Time               │
│ [2026-03-10]  [14:30]            │
│                                  │
│ Quick: [15min] [1hr] [3hr]       │
│        [Tomorrow 9am]            │
│        [Next Monday 9am]         │
│                                  │
│            [Cancel] [✅ Set]      │
└──────────────────────────────────┘
```

### 3. Get Notified

When the time comes:
- 🔔 **macOS notification** appears with your reminder text as the title
- 🔊 **Hero sound** plays
- 📌 **In-app notice** shows for 10 seconds
- 👆 **Click the notification** → Obsidian opens and jumps to the note

### 4. Track in Side Panel

Click the 🔔 bell icon in the left ribbon to open the Reminders Panel:

```
⏰ Reminders              [+ Add] [↻]
─────────────────────────────────────
📋 5 total · ⏳ 3 pending · ✅ 2 fired

⏳ UPCOMING
┌─────────────────────────────────┐
│ Review PR #42          [Pending]│
│ Check auth changes in the       │
│ feature-login branch            │
│ 🕐 Mar 10, 2026, 02:30 PM      │
│ 📄 meeting-notes.md             │
│ [📄 Go to note] [🗑️ Delete]     │
└─────────────────────────────────┘

✅ COMPLETED
┌─────────────────────────────────┐
│ ~Submit report~          [Done] │
│ 🕐 Mar 9, 2026, 11:00 AM       │
│ [📄 Go to note] [🗑️ Delete]     │
└─────────────────────────────────┘
```

---

## 📥 Installation

### Prerequisites (macOS)

```bash
brew install terminal-notifier
```

### From Obsidian Community Plugins
1. Settings → Community Plugins → Browse
2. Search "@ Reminder"
3. Install & Enable

### Manual Installation
```bash
# Clone and build
git clone https://github.com/amit123sharma/obsidian-at-reminder.git
cd obsidian-at-reminder
npm install && npm run build

# Copy to your vault
cp main.js manifest.json styles.css \
  "/path/to/vault/.obsidian/plugins/at-reminder/"
```

Then enable in Settings → Community Plugins.

---

## ⚙️ Settings

Go to **Settings → @ Reminder**:

| Setting | Description |
|---------|-------------|
| 🔊 Notification Sound | Toggle Hero sound on/off |
| 🧹 Clear Completed | Remove all fired reminders |
| ⚠️ Clear All | Remove all reminders |

---

## 🔔 macOS Notification Setup

Make sure notifications are enabled:
1. **System Settings → Notifications → Obsidian**
2. Allow Notifications: ✅ On
3. Alert style: **Banners** (recommended)

---

## 💡 Tips

- **Select text before pressing Cmd+Shift+R** — it auto-fills the reminder message
- **Use the Details field** for links, context, or instructions
- **Reminders persist** across Obsidian restarts
- **Reminders check every 15 seconds** — max 15s delay before notification fires
- **Each reminder is linked to the note** where it was created — click "Go to note" to jump there

---

## 🛠️ Development

```bash
npm install
npm run dev   # Watch mode (auto-rebuild on changes)
npm run build # Production build
```

---

## 📄 License

MIT

---

**Made with ❤️ for the Obsidian community by [Amit Sharma](https://github.com/amit123sharma)**
