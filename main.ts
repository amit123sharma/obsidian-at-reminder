import {
	App,
	Plugin,
	PluginSettingTab,
	Setting,
	Modal,
	Notice,
	ItemView,
	WorkspaceLeaf,
	MarkdownView,
	Editor,
	TFile,
	EditorSuggest,
	EditorPosition,
	EditorSuggestTriggerInfo,
	EditorSuggestContext,
	Menu,
} from "obsidian";
import { exec } from "child_process";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reminder {
	id: string;
	message: string;
	description: string; // optional detail text
	dateTime: string;
	filePath: string;
	line: number;
	fired: boolean;
	createdAt: string;
}

interface AtReminderSettings {
	reminders: Reminder[];
	notificationSound: boolean;
}

const DEFAULT_SETTINGS: AtReminderSettings = {
	reminders: [],
	notificationSound: true,
};

const VIEW_TYPE_REMINDERS = "at-reminder-panel";

// ─── Utility ─────────────────────────────────────────────────────────────────

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function formatDateTime(iso: string): string {
	const d = new Date(iso);
	return d.toLocaleString(undefined, {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function isPast(iso: string): boolean {
	return new Date(iso).getTime() <= Date.now();
}

function pad2(n: number): string {
	return n < 10 ? "0" + n : "" + n;
}

// ─── macOS Notification ──────────────────────────────────────────────────────
// Uses terminal-notifier for clean macOS notifications:
// - No "Show" button (clean banner)
// - Clicking notification activates Obsidian (via -activate flag)
// - Sound support via -sound flag
// - Does NOT auto-activate Obsidian (respects user's choice to ignore)

function sendNotification(title: string, message: string, sound: boolean, onClick?: () => void) {
	// Build terminal-notifier command
	const args = [
		`-title "${title.replace(/"/g, '\\"')}"`,
		`-message "${message.replace(/"/g, '\\"')}"`,
		`-activate "md.obsidian"`,               // Clicking notification opens Obsidian
		`-sender "md.obsidian"`,                  // Shows Obsidian icon on notification
		`-group "obsidian-reminder"`,             // Group notifications (replaces old ones)
	];

	if (sound) {
		args.push(`-sound "Hero"`);
	}

	const cmd = `/opt/homebrew/bin/terminal-notifier ${args.join(" ")}`;

	exec(cmd, (err: any) => {
		if (err) {
			console.error("terminal-notifier failed, falling back to osascript:", err);
			// Fallback to osascript if terminal-notifier not available
			const escapedMsg = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
			const escapedTitle = title.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
			const soundClause = sound ? ' sound name "Hero"' : "";
			const script = `display notification "${escapedMsg}" with title "${escapedTitle}"${soundClause}`;
			exec(`osascript -e '${script}'`);
		}
	});

	// Store the onClick handler — it will run when user opens Obsidian from notification
	if (onClick) {
		// Small delay to let Obsidian become active first
		const handler = () => {
			onClick();
			window.removeEventListener("focus", handler);
		};
		window.addEventListener("focus", handler);
		// Cleanup after 5 minutes if never triggered
		setTimeout(() => window.removeEventListener("focus", handler), 300000);
	}
}

// ─── Reminder Input Modal ────────────────────────────────────────────────────
// This is the main modal that lets you type a message and pick date/time.

class ReminderInputModal extends Modal {
	private plugin: AtReminderPlugin;
	private editor: Editor | null;
	private lineNumber: number;
	private prefillMessage: string;

	constructor(
		plugin: AtReminderPlugin,
		editor: Editor | null,
		lineNumber: number,
		prefillMessage: string = ""
	) {
		super(plugin.app);
		this.plugin = plugin;
		this.editor = editor;
		this.lineNumber = lineNumber;
		this.prefillMessage = prefillMessage;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("at-reminder-modal");

		contentEl.createEl("h2", { text: "⏰ New Reminder" });

		const formContainer = contentEl.createDiv({ cls: "at-reminder-form" });

		// Message input
		const msgGroup = formContainer.createDiv({ cls: "at-reminder-input-group" });
		msgGroup.createEl("label", { text: "What to remind?" });
		const msgInput = msgGroup.createEl("input", {
			type: "text",
			cls: "at-reminder-msg-input",
			placeholder: "e.g., Review PR, Submit report, Call John...",
			value: this.prefillMessage,
		}) as HTMLInputElement;
		msgInput.focus();

		// Description textarea (optional)
		const descGroup = formContainer.createDiv({ cls: "at-reminder-input-group" });
		descGroup.createEl("label", { text: "Details (optional)" });
		const descInput = descGroup.createEl("textarea", {
			cls: "at-reminder-desc-input",
			placeholder: "Add extra context, notes, links...",
		}) as HTMLTextAreaElement;
		descInput.rows = 3;

		// Date input
		const dateGroup = formContainer.createDiv({ cls: "at-reminder-input-group" });
		dateGroup.createEl("label", { text: "Date" });
		const dateInput = dateGroup.createEl("input", {
			type: "date",
			cls: "at-reminder-date-input",
		}) as HTMLInputElement;
		const today = new Date();
		dateInput.value = today.toISOString().split("T")[0];

		// Time input
		const timeGroup = formContainer.createDiv({ cls: "at-reminder-input-group" });
		timeGroup.createEl("label", { text: "Time" });
		const timeInput = timeGroup.createEl("input", {
			type: "time",
			cls: "at-reminder-time-input",
		}) as HTMLInputElement;
		const nextHour = new Date(today.getTime() + 60 * 60 * 1000);
		timeInput.value = pad2(nextHour.getHours()) + ":" + pad2(nextHour.getMinutes());

		// Quick presets
		const presetsContainer = formContainer.createDiv({ cls: "at-reminder-presets" });
		presetsContainer.createEl("span", { text: "Quick:", cls: "at-reminder-presets-label" });

		const presets = [
			{ label: "15 min", minutes: 15 },
			{ label: "1 hour", minutes: 60 },
			{ label: "3 hours", minutes: 180 },
			{ label: "Tomorrow 9am", minutes: -1 },
			{ label: "Next Monday 9am", minutes: -2 },
		];

		for (const preset of presets) {
			const btn = presetsContainer.createEl("button", {
				text: preset.label,
				cls: "at-reminder-preset-btn",
			});
			btn.addEventListener("click", () => {
				let target: Date;
				if (preset.minutes === -1) {
					target = new Date();
					target.setDate(target.getDate() + 1);
					target.setHours(9, 0, 0, 0);
				} else if (preset.minutes === -2) {
					target = new Date();
					const daysUntilMonday = ((8 - target.getDay()) % 7) || 7;
					target.setDate(target.getDate() + daysUntilMonday);
					target.setHours(9, 0, 0, 0);
				} else {
					target = new Date(Date.now() + preset.minutes * 60 * 1000);
				}
				dateInput.value = target.toISOString().split("T")[0];
				timeInput.value = pad2(target.getHours()) + ":" + pad2(target.getMinutes());
			});
		}

		// Buttons
		const btnContainer = formContainer.createDiv({ cls: "at-reminder-buttons" });

		const submitBtn = btnContainer.createEl("button", {
			text: "✅ Set Reminder",
			cls: "at-reminder-submit-btn mod-cta",
		});

		const cancelBtn = btnContainer.createEl("button", {
			text: "Cancel",
			cls: "at-reminder-cancel-btn",
		});

		// Enter key submits
		const doSubmit = () => {
			const message = msgInput.value.trim();
			if (!message) {
				new Notice("Please enter a reminder message.");
				msgInput.focus();
				return;
			}
			if (!dateInput.value || !timeInput.value) {
				new Notice("Please set both date and time.");
				return;
			}
			const dateTime = new Date(`${dateInput.value}T${timeInput.value}`).toISOString();
			if (isPast(dateTime)) {
				new Notice("⚠️ The selected time is in the past. Please choose a future time.");
				return;
			}
			this.createReminder(message, descInput.value.trim(), dateTime);
			this.close();
		};

		submitBtn.addEventListener("click", doSubmit);
		cancelBtn.addEventListener("click", () => this.close());

		// Allow Enter to submit from message and date/time inputs (not textarea)
		const onKeydown = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				doSubmit();
			}
		};
		msgInput.addEventListener("keydown", onKeydown);
		dateInput.addEventListener("keydown", onKeydown);
		timeInput.addEventListener("keydown", onKeydown);
	}

	async createReminder(message: string, description: string, dateTime: string) {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		const filePath = view?.file?.path || "unknown";
		const lineNum = this.editor ? this.editor.getCursor().line : this.lineNumber;

		const reminder: Reminder = {
			id: generateId(),
			message,
			description: description || "",
			dateTime,
			filePath,
			line: lineNum,
			fired: false,
			createdAt: new Date().toISOString(),
		};

		this.plugin.settings.reminders.push(reminder);
		await this.plugin.saveSettings();
		this.plugin.refreshPanel();

		// Insert reminder marker into the note
		if (this.editor) {
			const formattedTime = formatDateTime(dateTime);
			const cursor = this.editor.getCursor();
			const currentLine = this.editor.getLine(cursor.line);

			// If line is empty or cursor is at end, append. Otherwise insert on new line.
			if (currentLine.trim() === "") {
				this.editor.setLine(cursor.line, `⏰ remind: "${message}" — ${formattedTime}`);
			} else {
				// Insert at end of current line
				const insertText = `  ⏰ remind: "${message}" — ${formattedTime}`;
				this.editor.replaceRange(insertText, { line: cursor.line, ch: currentLine.length });
			}
		}

		new Notice(`✅ Reminder set: "${message}" at ${formatDateTime(dateTime)}`);
	}

	onClose() {
		this.contentEl.empty();
	}
}

// ─── Slash Command Suggest ───────────────────────────────────────────────────
// Type /remind to trigger the reminder modal

class ReminderSuggest extends EditorSuggest<string> {
	plugin: AtReminderPlugin;

	constructor(plugin: AtReminderPlugin) {
		super(plugin.app);
		this.plugin = plugin;
	}

	onTrigger(cursor: EditorPosition, editor: Editor): EditorSuggestTriggerInfo | null {
		const line = editor.getLine(cursor.line);
		const subStr = line.substring(0, cursor.ch);

		// Trigger on /remind or /rem
		const match = subStr.match(/\/remind?$/);
		if (match) {
			return {
				start: { line: cursor.line, ch: match.index! },
				end: cursor,
				query: match[0],
			};
		}
		return null;
	}

	getSuggestions(context: EditorSuggestContext): string[] {
		return [
			"⏰ Set a new reminder",
			"📋 Open reminders panel",
		];
	}

	renderSuggestion(value: string, el: HTMLElement): void {
		el.createEl("div", { text: value, cls: "at-reminder-suggest-item" });
	}

	selectSuggestion(value: string, evt: MouseEvent | KeyboardEvent): void {
		if (!this.context) return;

		const editor = this.context.editor;

		// Remove the /remind text
		editor.replaceRange(
			"",
			this.context.start,
			this.context.end
		);

		if (value.startsWith("⏰")) {
			// Open reminder modal
			new ReminderInputModal(this.plugin, editor, editor.getCursor().line).open();
		} else {
			// Open panel
			this.plugin.activatePanel();
		}
	}
}

// ─── Reminder Side Panel View ────────────────────────────────────────────────

class ReminderPanelView extends ItemView {
	plugin: AtReminderPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: AtReminderPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewType() { return VIEW_TYPE_REMINDERS; }
	getDisplayText() { return "⏰ Reminders"; }
	getIcon() { return "bell"; }

	async onOpen() { this.renderPanel(); }

	renderPanel() {
		const container = this.containerEl.children[1];
		container.empty();
		container.addClass("at-reminder-panel");

		// Header
		const header = container.createDiv({ cls: "at-reminder-panel-header" });
		header.createEl("h3", { text: "⏰ Reminders" });

		const headerBtns = header.createDiv({ cls: "at-reminder-header-btns" });

		const addBtn = headerBtns.createEl("button", {
			text: "+ Add",
			cls: "at-reminder-add-btn",
		});
		addBtn.addEventListener("click", () => {
			new ReminderInputModal(this.plugin, null, 0).open();
		});

		const refreshBtn = headerBtns.createEl("button", {
			text: "↻",
			cls: "at-reminder-refresh-btn",
			attr: { "aria-label": "Refresh" },
		});
		refreshBtn.addEventListener("click", () => this.renderPanel());

		const reminders = [...this.plugin.settings.reminders].sort(
			(a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
		);

		if (reminders.length === 0) {
			const emptyState = container.createDiv({ cls: "at-reminder-empty-state" });
			emptyState.createEl("div", { text: "🔔", cls: "at-reminder-empty-icon" });
			emptyState.createEl("p", { text: "No reminders yet" });
			emptyState.createEl("p", {
				text: "Use Cmd+Shift+R, /remind, or the + button above to add one.",
				cls: "at-reminder-hint",
			});
			return;
		}

		// Stats
		const stats = container.createDiv({ cls: "at-reminder-stats" });
		const pending = reminders.filter((r) => !r.fired).length;
		const fired = reminders.filter((r) => r.fired).length;
		stats.createEl("span", {
			text: `📋 ${reminders.length} total · ⏳ ${pending} pending · ✅ ${fired} fired`,
			cls: "at-reminder-stats-text",
		});

		// Sections
		const upcoming = reminders.filter((r) => !r.fired);
		const past = reminders.filter((r) => r.fired);

		if (upcoming.length > 0) {
			const section = container.createDiv({ cls: "at-reminder-section" });
			section.createEl("h4", { text: "⏳ Upcoming" });
			for (const r of upcoming) this.renderCard(section, r, false);
		}

		if (past.length > 0) {
			const section = container.createDiv({ cls: "at-reminder-section" });
			section.createEl("h4", { text: "✅ Completed" });
			for (const r of past) this.renderCard(section, r, true);
		}
	}

	renderCard(parent: HTMLElement, reminder: Reminder, isFired: boolean) {
		const card = parent.createDiv({
			cls: `at-reminder-card ${isFired ? "at-reminder-card-fired" : "at-reminder-card-pending"}`,
		});

		const topRow = card.createDiv({ cls: "at-reminder-card-top" });
		topRow.createEl("span", { text: reminder.message, cls: "at-reminder-card-message" });
		topRow.createEl("span", {
			text: isFired ? "Done" : "Pending",
			cls: `at-reminder-badge ${isFired ? "at-reminder-badge-fired" : "at-reminder-badge-pending"}`,
		});

		// Show description if present
		if (reminder.description) {
			card.createEl("p", {
				text: reminder.description,
				cls: "at-reminder-card-desc",
			});
		}

		const detailsRow = card.createDiv({ cls: "at-reminder-card-details" });
		detailsRow.createEl("span", {
			text: `🕐 ${formatDateTime(reminder.dateTime)}`,
			cls: "at-reminder-card-time",
		});
		if (reminder.filePath && reminder.filePath !== "unknown") {
			detailsRow.createEl("span", {
				text: `📄 ${reminder.filePath.split("/").pop()}`,
				cls: "at-reminder-card-file",
			});
		}

		const actionsRow = card.createDiv({ cls: "at-reminder-card-actions" });

		if (reminder.filePath && reminder.filePath !== "unknown") {
			const navBtn = actionsRow.createEl("button", { text: "📄 Go to note", cls: "at-reminder-action-btn" });
			navBtn.addEventListener("click", async () => {
				const file = this.app.vault.getAbstractFileByPath(reminder.filePath);
				if (file && file instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(file);
					const view = leaf.view;
					if (view instanceof MarkdownView && view.editor) {
						view.editor.setCursor({ line: reminder.line, ch: 0 });
					}
				} else {
					new Notice("File not found: " + reminder.filePath);
				}
			});
		}

		const delBtn = actionsRow.createEl("button", {
			text: "🗑️ Delete",
			cls: "at-reminder-action-btn at-reminder-delete-btn",
		});
		delBtn.addEventListener("click", async () => {
			this.plugin.settings.reminders = this.plugin.settings.reminders.filter((r) => r.id !== reminder.id);
			await this.plugin.saveSettings();
			this.renderPanel();
			new Notice("Reminder deleted.");
		});
	}

	async onClose() {}
}

// ─── Settings Tab ────────────────────────────────────────────────────────────

class AtReminderSettingTab extends PluginSettingTab {
	plugin: AtReminderPlugin;

	constructor(app: App, plugin: AtReminderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl("h2", { text: "⏰ Reminder Settings" });

		new Setting(containerEl)
			.setName("Notification Sound")
			.setDesc("Play a sound when a reminder fires (macOS)")
			.addToggle((t: any) => t.setValue(this.plugin.settings.notificationSound).onChange(async (v: boolean) => {
				this.plugin.settings.notificationSound = v;
				await this.plugin.saveSettings();
			}));

		new Setting(containerEl)
			.setName("Clear Completed Reminders")
			.setDesc("Remove all reminders that have already fired")
			.addButton((b: any) => b.setButtonText("Clear Completed").onClick(async () => {
				this.plugin.settings.reminders = this.plugin.settings.reminders.filter((r) => !r.fired);
				await this.plugin.saveSettings();
				this.plugin.refreshPanel();
				new Notice("Cleared completed reminders.");
			}));

		new Setting(containerEl)
			.setName("Clear All Reminders")
			.setDesc("Remove all reminders")
			.addButton((b: any) => b.setButtonText("Clear All").setWarning().onClick(async () => {
				this.plugin.settings.reminders = [];
				await this.plugin.saveSettings();
				this.plugin.refreshPanel();
				new Notice("Cleared all reminders.");
			}));
	}
}

// ─── Main Plugin ─────────────────────────────────────────────────────────────

export default class AtReminderPlugin extends Plugin {
	settings: AtReminderSettings = DEFAULT_SETTINGS;
	private checkInterval: number | null = null;

	async onload() {
		await this.loadSettings();

		// Register side panel view
		this.registerView(VIEW_TYPE_REMINDERS, (leaf) => new ReminderPanelView(leaf, this));

		// Register /remind slash command suggest
		this.registerEditorSuggest(new ReminderSuggest(this));

		// Ribbon icon
		this.addRibbonIcon("bell", "Open Reminders", () => this.activatePanel());

		// ─── Commands ──────────────────────────────────────────────────────

		// Cmd+Shift+R — Add new reminder (hotkey set below)
		this.addCommand({
			id: "add-new-reminder",
			name: "Add new reminder",
			hotkeys: [{ modifiers: ["Mod", "Shift"], key: "r" }],
			editorCallback: (editor: Editor) => {
				// If text is selected, use it as the prefill message
				const selection = editor.getSelection();
				new ReminderInputModal(this, editor, editor.getCursor().line, selection).open();
			},
		});

		// Add reminder for current line (no hotkey, use command palette)
		this.addCommand({
			id: "add-reminder-selected-text",
			name: "Add reminder for selected text",
			editorCallback: (editor: Editor) => {
				const selection = editor.getSelection();
				if (!selection) {
					new Notice("Select some text first to create a reminder for it.");
					return;
				}
				new ReminderInputModal(this, editor, editor.getCursor().line, selection).open();
			},
		});

		// Open reminders panel
		this.addCommand({
			id: "open-reminders-panel",
			name: "Open Reminders Panel",
			callback: () => this.activatePanel(),
		});

		// ─── Right-click context menu ──────────────────────────────────────
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor) => {
				const selection = editor.getSelection();
				menu.addItem((item: any) => {
					item
						.setTitle("⏰ Set reminder" + (selection ? ` for "${selection.substring(0, 30)}..."` : ""))
						.setIcon("bell")
						.onClick(() => {
							new ReminderInputModal(this, editor, editor.getCursor().line, selection || "").open();
						});
				});
			})
		);

		// ─── Reminder checker (every 15 seconds) ──────────────────────────
		this.checkInterval = window.setInterval(() => this.checkReminders(), 15000);
		this.registerInterval(this.checkInterval);

		// Add settings tab
		this.addSettingTab(new AtReminderSettingTab(this.app, this));

		// Check on load
		this.checkReminders();

		console.log("⏰ Reminder plugin loaded — Use Cmd+Shift+R, /remind, or right-click to add reminders");
	}

	onunload() {
		if (this.checkInterval) window.clearInterval(this.checkInterval);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	checkReminders() {
		const now = Date.now();
		let changed = false;

		for (const reminder of this.settings.reminders) {
			if (reminder.fired) continue;
			if (new Date(reminder.dateTime).getTime() <= now) {
				reminder.fired = true;
				changed = true;

				// Send native notification — clicking it focuses Obsidian and navigates to the note
				const filePath = reminder.filePath;
				const lineNum = reminder.line;
				const app = this.app;
				// Notification title = reminder text, body = description + note info
				const notifBody = (reminder.description || "") + (reminder.filePath !== "unknown" ? "\n📄 " + reminder.filePath.split("/").pop() : "");
				sendNotification(reminder.message, notifBody || "Obsidian Reminder", this.settings.notificationSound, async () => {
					// Navigate to the note when notification is clicked
					if (filePath && filePath !== "unknown") {
						const file = app.vault.getAbstractFileByPath(filePath);
						if (file && file instanceof TFile) {
							const leaf = app.workspace.getLeaf(false);
							await leaf.openFile(file);
							const view = leaf.view;
							if (view instanceof MarkdownView && view.editor) {
								view.editor.setCursor({ line: lineNum, ch: 0 });
							}
						}
					}
				});
				new Notice(`⏰ Reminder: ${reminder.message}`, 10000);
			}
		}

		if (changed) {
			this.saveSettings();
			this.refreshPanel();
		}
	}

	async activatePanel() {
		const { workspace } = this.app;
		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE_REMINDERS);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: VIEW_TYPE_REMINDERS, active: true });
			}
		}
		if (leaf) workspace.revealLeaf(leaf);
	}

	refreshPanel() {
		for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE_REMINDERS)) {
			if (leaf.view instanceof ReminderPanelView) {
				(leaf.view as ReminderPanelView).renderPanel();
			}
		}
	}
}
