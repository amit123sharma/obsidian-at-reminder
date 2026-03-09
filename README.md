# @ Reminder - Obsidian Plugin

Set reminders directly in your notes using the `@remind` syntax. Get native macOS notifications when your reminders fire, and track all reminders in a convenient side panel.

## Features

- **`@remind` syntax** — Type `@remind("your message")` anywhere in a note and a date/time picker pops up
- **macOS native notifications** — Get system-level notifications with sound when reminders fire
- **Side panel tracker** — View all your reminders (upcoming and fired) sorted in ascending order
- **Quick presets** — Set reminders for "In 15 min", "In 1 hour", "In 3 hours", or "Tomorrow 9am"
- **Navigate to note** — Click any reminder in the panel to jump directly to the note and line
- **Persistent storage** — Reminders survive Obsidian restarts

## Usage

### Creating a Reminder

1. In any note, type:
   ```
   @remind("Buy groceries")
   ```

2. When you type the closing `)`, a modal will pop up to set the date and time

3. Pick a date/time (or use a quick preset), then click **Set Reminder**

4. The line will be updated to show the scheduled time:
   ```
   @remind("Buy groceries") ⏰ Mar 10, 2026, 02:30 PM
   ```

### Viewing All Reminders

- Click the **🔔 bell icon** in the left ribbon, or
- Use the command palette: **@ Reminder: Open Reminders Panel**

The side panel shows:
- **Stats** — Total, pending, and fired counts
- **Upcoming** — Future reminders sorted by time (ascending)
- **Fired** — Past reminders that already triggered

Each reminder card shows:
- The message
- Scheduled date/time
- Source file name
- **Go to note** button to navigate to the exact line
- **Delete** button to remove the reminder

### Settings

Go to **Settings → @ Reminder** to:
- Toggle notification sound on/off
- Clear all fired reminders
- Clear all reminders

## Installation

### Manual Installation

1. Copy these 3 files into your Obsidian vault's plugin folder:
   ```
   <your-vault>/.obsidian/plugins/at-reminder/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

2. Restart Obsidian

3. Go to **Settings → Community Plugins** and enable **@ Reminder**

### From this project

```bash
# Build
npm install
npm run build

# Then copy main.js, manifest.json, and styles.css to your vault
cp main.js manifest.json styles.css /path/to/vault/.obsidian/plugins/at-reminder/
```

## How It Works

1. **Detection**: The plugin listens for keystrokes. When you complete `@remind("...")` by typing `)`, it detects the pattern and shows a date/time picker modal.

2. **Scheduling**: Reminders are stored in the plugin's data.json file with their target date/time, source file, and line number.

3. **Checking**: Every 15 seconds, the plugin checks if any pending reminders have reached their time.

4. **Notification**: When a reminder fires, it:
   - Sends a native macOS notification via `osascript`
   - Shows an in-app Obsidian notice
   - Updates the reminder status in the side panel

## Requirements

- **Obsidian** v1.0.0+
- **macOS** (for native notifications via `osascript`)
