# Prompt Library

A personal, portable library of prompts you copy into ChatGPT, Claude, Gemini, Copilot — or whatever you're in that day.

Open `index.html` in a browser. No server, no build, no dependencies. Works offline and straight off the file system.

## The frame

Every prompt here is built on the same five parts — the same frame taught in the concrete AI course:

| Part | What it does |
| --- | --- |
| **ROLE** | Who the model is. Sets vocabulary, depth, and what it assumes about you. |
| **FACTS** | The real inputs. Measurements, numbers, the source text. This is where most prompts fail. |
| **TASK** | One clear instruction. |
| **FORMAT** | Where it goes and how long. Table, bullets, under 150 words. |
| **CHECK** | Tell it to surface assumptions and gaps instead of guessing. |

The `CHECK` line is the one people skip, and it's the reason AI output is confident and wrong. `bid-reviewer` has its own `CHECK` rule: quote the line number behind every finding.

## Using it

1. **Search** — `/` jumps to the search box. It searches titles, summaries, tags, categories, and the prompt body, so `change order` finds it even if the word isn't in the title.
2. **Filter** — by category, by which model a prompt is tuned for, or to favorites only.
3. **Show** — expand a card to read the full prompt.
4. **Fill the blanks** — variables appear as `{{UPPERCASE}}` in red. Type over them; the preview updates live and turns green.
5. **Copy** — copies the finished prompt, blanks and all. The button tells you how many are still open, and the toast names them. Nothing gets copied silently half-finished.

Red `{{TOKEN}}` means unfilled. Green means filled. If you copy with blanks still in it, you'll see exactly which ones before you paste.

## Adding prompts

**One at a time** — click **+ New prompt**. Type a title, paste the prompt, hit **Save**. That's the whole job.

Anything you wrap in double braces becomes a fill-in blank automatically:

```
Element: {{ELEMENT}}
Notes: {{NOTES}}
```

The moment you paste, those turn into a "Blanks to fill in" list so you can drop a short hint on each — what goes in that slot. That's the only field worth touching.

**Several at once** — click **+ Add many** and paste a whole batch. Separate each prompt with a line containing `---`, and start each with `# Title`:

```
# Pre-Pour Checklist
ROLE: QA inspector for concrete work.
Element: {{ELEMENT}}
TASK: Tell me whether to proceed with this pour.

---

# Change Order Follow-Up
ROLE: contracts writer.
Summarize where this change order stands and what you need from me.
```

Titles are optional — without a `#` line, the first line becomes the title. Everything else (category, tags, models, summary) is filled in from the text and you can tidy it later with **Edit**.

Escape out of either box with **Cancel**, the **✕**, or **Esc**.

⚠️ **Both save to this browser only.** Clear your browsing data or switch computers and they're gone. Click **Export JSON** afterwards for a backup, and **Import** to bring it back.

## Editing

- **Edit** on any card reopens it in the same box.
- **Import** takes a JSON file: **OK replaces** your library, **Cancel merges** into it.
- **Export JSON** gives you a backup. Keep it somewhere you actually back up.

If you edit a prompt and later want the original back, open the browser console and run `promptLibrary.reset()`.

From the console you can also script it:

```js
promptLibrary.get()            // your whole library as JSON
promptLibrary.export()         // same thing, as a string
promptLibrary.add({ title, body, cat, tags, models, vars, notes })
promptLibrary.import(jsonArray)
promptLibrary.reset()
```

## Adding prompts permanently

Two ways:

**In the browser** — use **+ New prompt**. Fast, and it works offline. Export to JSON when you want to keep it.

**In `prompts.js`** — this is the source of truth for a fresh browser. It's plain JS rather than JSON on purpose, so it loads over `file://` without a server. Add an object to the `window.PROMPT_LIBRARY` array:

```js
{
  id: "pre-pour-checklist",
  title: "Pre-Pour Checklist Review",
  cat: "Site Operations",
  tags: ["qc", "pours"],
  models: ["Any"],           // which models it's tuned for
  fav: false,
  summary: "One line. What problem does it solve?",
  vars: [
    { k: "ELEMENT", hint: "slab / wall / footing" },
    { k: "NOTES", hint: "what the crew reported" }
  ],
  body: `ROLE: QA inspector for concrete work.

FACTS:
Element: {{ELEMENT}}
Crew reported: {{NOTES}}

TASK: Review this before the pour and tell me whether to proceed.

FORMAT: GO / HOLD, then the reasons, then what to fix first.

CHECK: If you cannot judge something from what I wrote, say so.`,
  notes: "Optional. When to use it, what you learned."
}
```

The `body` is a template literal, so backticks and `${` inside a prompt will break it. Everything else is plain text.

Variables are just `{{NAME}}` inside the body. The UI reads them from the `vars` list — keep the two in sync, or the field won't appear.

## What's in it

32 prompts across 8 categories: Foundations, Estimating & Bidding, Site Operations, Finance & Cash, Sales & Presales, PMO & Leadership, Writing & Content, Personal & Utility.

The ones you'll reach for most:

- `five-part-frame` — the frame itself. Start here when output comes back vague.
- `summarize-bullets` — the workhorse. Refuses to invent a number you didn't give it.
- `hostile-review` — run before you send anything. Finds the flaw before a client does.
- `bid-reviewer` — adversarial read of a finished bid.
- `daily-site-log` — raw field notes into a dated job log.
- `pre-mortem` — assume it already failed, then write how it failed.

## Notes

- Prompts are stored in `localStorage` under `prompt-library:v1`, scoped to the browser you added them in. Export JSON if that matters.
- Clear-site data will wipe it. Again: export.
- Theme follows your `prompt-library:theme` setting and defaults to light.