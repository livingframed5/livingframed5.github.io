# Weekly Pricing Intelligence Brief — AI Agent (n8n)

A self-hosted **AI workflow that runs on its own** (every Monday 6:00 AM, no one needs to be online) and produces a **steering-ready pricing memo** from competitive price data and transaction-level margin data.

You are not a coder. Everything here is **visual nodes + one small block of logic that is already written for you**. You can run it, edit it, and — most importantly — *talk about it intelligently in an interview*.

---

## What it does

```
Monday 6:00 AM (schedule)
   │
   ▼
1. GATHER   Read 2 files: competitor prices + transaction margins   (Read/Write Files from Disk)
   │
   ▼
2. PARSE    Convert CSV rows into structured data                   (Extract From File)
   │
   ▼
3. REASON   Build an analysis prompt                                 (Code node — pre-written)
   │
   ▼
4. DRAFT    LLM writes a first draft memo                            (OpenAI: "Draft Pricing Memo")
   │
   ▼
5. REVIEW   A second LLM pass fact-checks + improves it              (OpenAI: "Critic LLM")
   │
   ▼
6. DELIVER  Save memo to data\output\pricing-memo-YYYY-MM-DD.md      (Convert to File + Save to Disk)
   │
   ▼
   [Optional] Email the memo to yourself when you add SMTP
```

This is the **universal agent pattern** you're here to learn: `Trigger → Gather → Reason → Produce → Deliver → Review`. Every job-duty workflow in the plan (weekly steering reports, competitive intelligence, EVE/value models, segmentation memos, proposals) is this same skeleton with different inputs and prompts.

---

## The folder

```
pricing-intelligence-agent/
├── start-n8n.ps1          ← run this to start n8n (generates config + secrets first time)
├── stop-n8n.ps1           ← run this to stop n8n
├── data/
│   ├── sample_competitive_prices.csv   ← your "competitor data" (swap in your own later)
│   ├── sample_transactions.csv         ← your "transaction margin data" (swap in your own later)
│   └── output/                         ← where the weekly memos are saved
└── workflows/
    └── weekly-pricing-intelligence-brief.json   ← the workflow you import into n8n
```

---

## Setup (first run, ~15 minutes)

1. **Make sure Docker Desktop is running.** You already have Docker installed — open Docker Desktop and wait until the whale icon is steady.
2. **Start n8n.** Open **PowerShell**, go to this folder, and run:
   ```powershell
   Set-ExecutionPolicy -Scope Process Bypass   # one-time, only for this session
   .\start-n8n.ps1
   ```
   First run pulls the n8n image (~1 GB, takes a few minutes), then opens `http://localhost:5678` in your browser.
3. **Create your n8n account** in the browser (email + password). This is your personal login to the n8n dashboard.
4. **Add your OpenAI key (the only paid piece, ~cents per run):**
   - Click **Credentials → Add credential → OpenAI API** (or search "OpenAI").
   - Paste a key from https://platform.openai.com/api-keys (create one, add a few dollars of credit).
   - Name it exactly: `OpenAI account` — the workflow already expects that name.
5. **Import the workflow:**
   - In n8n: **Workflows → Add workflow** → click the **⋮ (three dots) menu → Import from File** (or `Ctrl+Shift+I` in the canvas).
   - Choose `workflows\weekly-pricing-intelligence-brief.json`.
6. **Run it once by hand:**
   - In the workflow, click **"Execute workflow"** (top right). Because the trigger is a schedule, this runs it once immediately.
   - The OpenAI nodes should show **green**. Then open `data\output\` — you'll find your first memo.
7. **Turn on the schedule (make it run while you're offline):**
   - Click the **"Inactive / Active" toggle** to **Active** in the top right of the workflow.
   - Now it fires every Monday 6:00 AM automatically. Keep your PC on (or later move to a cheap VPS — see Roadmap).
8. **Optional — email delivery:** add an SMTP credential (Gmail: use an app password) in **Credentials → SMTP**, open the grey "Email Memo" node, pick your SMTP credential, set your email, then drag a wire from **Save Memo to Disk** → **Email Memo**.

---

## Replacing the sample data with your own

The sample data is an illustrative "home coffee pod" market (brand `AuroraRoast` = your client). To make it real:

- Open `data\sample_competitive_prices.csv` in Excel/Notepad and keep these columns (names matter):
  `date, brand, product, segment, channel, list_price, promo_price, promo_active, est_weekly_volume, unit_cost`
- Open `data\sample_transactions.csv` and keep:
  `invoice_id, date, product, segment, channel, qty, net_price, unit_cost, margin_contrib`
- Edit the "Build Pricing Analysis Prompt" node to change the market name / our-brand name, and tweak the memo sections to match your industry (CPG, Retail, Industrial — the job posting's preferred sectors).
- Next Monday's run uses your file automatically. You never touch a line of code.

---

## What this teaches you (map to the Deloitte job)

| Job duty in the posting | What you built / learned |
|---|---|
| "Weekly steering reports, project status, risks" | The weekly memo is literally a steering report with risks & monitoring |
| "Competitive analysis, pricing strategy" | The Competitive Pricing Snapshot section, fed by competitor price files |
| "Transaction-level quantitative analytics" | The Margin Analysis section, fed by transaction CSV rows |
| "Economic Value Estimates, value-based pricing" | The Value-based Pricing section in the prompt framework (EVE logic) |
| "Granular customer segmentation" | The Segmentation Implications section (premium vs value) |
| "Oversee implementation of technology / pricing systems" | You *operate* a pricing-tech workflow (n8n + LLM) end to end |
| "Develop methodologies, thought-ware" | The reusable workflow + this README is exactly that artifact |
| "Lead programs with technology components (PROS, PriceFx, Vendavo)" | Same muscle: pricing data → analytics → automated decision support |

**Interview line you can use:** *"I built an automated weekly pricing-intelligence agent: it ingests competitor price files and transaction-level margin data, applies a value-based pricing framework, drafts a steering memo, runs a second LLM pass to fact-check and sharpen recommendations, and delivers it before the team arrives — with a human approval gate."* That is practice development + POV + technology delivery in one sentence.

---

## Roadmap (the plan you approved)

1. **Done now — Core memo:** schedule → data → LLM draft → save. ✅
2. **Live data:** replace CSV reading with live sources — n8n has a **HTTP Request** node (pull competitor pages/RSS/APIs) and **Google Sheets** node. Make "industry" a single variable you change per client.
3. **Agentic loop:** add a **Wait node** (approve/decline) before delivery = human-in-the-loop governance (interview gold).
4. **Knowledge base:** store past memos and turn the draft node into an **AI Agent** node with memory/tools so it remembers your framework and learns each week.
5. **Run truly unattended:** deploy the same `docker-compose.yml` to a $5 VPS (Render/Railway/DigitalOcean) so it runs even when your laptop is off.

---

## Troubleshooting

- **`n8n` won't start / port busy** → something is on port 5678. Change the port in `docker-compose.yml` (`"5678:5678"` → `"5679:5678"`) and open `http://localhost:5679`.
- **OpenAI node red: "Credential not found"** → you didn't name it `OpenAI account`. Reopen the node → select the credential.
- **Read node red: "path not accessible"** → the `data` folder must exist next to `docker-compose.yml` (it does) and the container must be the one created by `start-n8n.ps1` (it has the `/data` mount).
- **"Execute workflow" runs but memo is empty** → open the node that failed (red) and read its message; paste it to an AI assistant or this project's docs.
- **Secrets**: your `docker-compose.yml` has random keys generated on first run. It's local-only. Don't share it.
