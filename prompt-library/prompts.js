/* Prompt Library — seed data.
   Plain JS (not JSON) so it loads over file:// with no server.
   Loaded as a classic script: window.PROMPT_LIBRARY = [ ... ] */

window.PROMPT_LIBRARY = [
  /* ---------------------------- FOUNDATIONS ---------------------------- */
  {
    id: "five-part-frame",
    title: "Five-Part Frame (Role / Facts / Task / Format / Check)",
    cat: "Foundations",
    tags: ["framework", "core", "structure"],
    models: ["Any"],
    fav: true,
    summary: "The house structure for every prompt. Start here when something comes back vague.",
    vars: [
      { k: "ROLE", hint: "estimator's assistant / proposal writer / CFO" },
      { k: "FACTS", hint: "the real inputs — measurements, numbers, the source text" },
      { k: "TASK", hint: "one clear instruction" },
      { k: "FORMAT", hint: "where it goes and how long — table, bullets, under 150 words" }
    ],
    body: `ROLE: {{ROLE}}

FACTS:
{{FACTS}}

TASK: {{TASK}}

FORMAT: {{FORMAT}}

CHECK: Before you answer, list anything you had to assume and anything I left out that you need from me. If a number is missing, write MISSING: <what> instead of guessing.`,
    notes: "When a prompt underperforms, the gap is almost always FACTS or CHECK — not the model. Add the missing facts before you add more instructions."
  },
  {
    id: "fix-my-prompt",
    title: "Fix My Prompt",
    cat: "Foundations",
    tags: ["meta", "quality"],
    models: ["Any"],
    fav: true,
    summary: "Rewrites a rough prompt so a literal assistant gets it right the first time.",
    vars: [
      { k: "DRAFT", hint: "paste your current prompt, rough is fine" }
    ],
    body: `You are a prompt engineer. Rewrite the prompt below so a competent-but-literal assistant gets it right on the first try.

MY DRAFT:
{{DRAFT}}

Return in this order:
1. A table — What's missing | Why it matters | Fix. "Missing" means anything that would cause a vague or wrong answer: role, audience, inputs, format, length, tone, constraints, edge cases, and what to do when information is absent.
2. A REWRITTEN PROMPT block, ready to paste.
3. Three bullets — what I should have told you up front.`,
    notes: "Paste the answer back in afterward with 'hostile-review' if you want the output checked too."
  },
  {
    id: "ask-me-first",
    title: "Ask Me Questions First",
    cat: "Foundations",
    tags: ["clarity", "meta"],
    models: ["Any"],
    summary: "Forces clarification on the gaps that actually matter, before any work happens.",
    vars: [
      { k: "TASK", hint: "what you want done" }
    ],
    body: `{{TASK}}

Before you do anything else, ask me up to 5 questions — only the ones where a wrong assumption would change your answer. Mark any that are blocking.

Wait for my replies, then do the work. Do not answer yet.`,
    notes: "The highest-leverage habit for big tasks. Saves a full wasted draft."
  },
  {
    id: "explain-to-me",
    title: "Teach Me This",
    cat: "Foundations",
    tags: ["learning", "personal"],
    models: ["Any"],
    summary: "Plain-English teaching with a practical exercise. No padding.",
    vars: [
      { k: "TOPIC", hint: "e.g. why my concrete bid lost 4 points" },
      { k: "LEVEL", hint: "beginner / intermediate / expert" }
    ],
    body: `Teach me {{TOPIC}} at a {{LEVEL}} level.

Structure:
1. One paragraph, plain English, zero jargon — what is actually happening.
2. The 3 things that matter in practice, and why those 3.
3. The 2 mistakes people new to this make.
4. One exercise I can do in under 10 minutes.

RULES: If a term is unavoidable, define it the first time you use it. Skip anything I didn't ask for. Do not pad with background I don't need.`,
    notes: "Swap LEVEL for a specific situation to get much sharper answers."
  },

  /* ------------------------ ESTIMATING & BIDDING ---------------------- */
  {
    id: "quantity-takeoff",
    title: "Quantity Takeoff Table",
    cat: "Estimating & Bidding",
    tags: ["takeoff", "quantities", "core"],
    models: ["Any"],
    fav: true,
    summary: "Line-item takeoff with visible math, and it refuses to invent a dimension.",
    vars: [
      { k: "SPEC", hint: "the scope of work, plans, or your field notes" },
      { k: "WASTE", hint: "e.g. 5%" }
    ],
    body: `ROLE: estimator's assistant for a concrete contractor.

FACTS / INPUT:
{{SPEC}}

WASTE FACTOR: {{WASTE}}

TASK: Build a quantity takeoff, one row per line item.

FORMAT:
- Table with Item, Dimensions (with units), Quantity, Unit, Notes.
- Then TOTALS, summing by unit (CY, SF, LF, EA).
- Then ASSUMPTIONS — every number you inferred and where it came from.

CHECK: Show the math for each quantity. If a dimension, thickness, psi, or waste factor is missing, do not assume it — put that row under NEEDS INPUT and name the exact value you need.`,
    notes: "The NEEDS INPUT list is the point. It stops a silent guess from becoming a priced line item."
  },
  {
    id: "scope-to-line-items",
    title: "Scope to Line Items",
    cat: "Estimating & Bidding",
    tags: ["scope", "bid", "exclusions"],
    models: ["Any"],
    summary: "Turns a scope of work into priced-ready line items, and flags what the scope forgot.",
    vars: [
      { k: "SCOPE", hint: "the scope text, verbatim" }
    ],
    body: `ROLE: estimator's assistant.

SCOPE (verbatim from the client's documents):
{{SCOPE}}

TASK: Break this scope into bid line items grouped by category — Demo, Formwork, Reinforcing, Concrete, Finishing, Mechanical, Misc.

RULES: Use only items the scope text supports. Do NOT add items the scope writer forgot.

FORMAT:
- Table: Line #, Category, Description, Unit, Qty (leave Qty blank for me).
- UNSURE — items the scope implies but never states.
- NOT IN SCOPE — items a reader might assume are included.`,
    notes: "Pair with 'proposal-writer'. The NOT IN SCOPE list feeds your exclusions directly."
  },
  {
    id: "bid-reviewer",
    title: "Bid Reviewer (Pre-Send Check)",
    cat: "Estimating & Bidding",
    tags: ["review", "risk", "core"],
    models: ["Any"],
    fav: true,
    summary: "Adversarial read of a finished bid to find what will cost money after you sign.",
    vars: [
      { k: "BID", hint: "your full bid or proposal" }
    ],
    body: `ROLE: senior estimator reviewing a bid before it goes out.

BID:
{{BID}}

TASK: Find what will cost us money. Look specifically for: missing line items, quantity errors, unit-price mismatches, exclusions that will come back as change orders, gaps between the proposal and the drawings, and unpriced alternates.

FORMAT:
- Table: Severity (High/Med/Low), Finding, Where in the bid, Suggested fix.
- Then TOP 3 THINGS TO CHECK BEFORE WE SEND.

CHECK: Quote the specific line or number behind every finding. If you can't point to it, leave it out. Do not rewrite the bid — I only want the problems.`,
    notes: "Run this on every bid. It catches more than rereading does."
  },
  {
    id: "margin-leak",
    title: "Margin Leak Finder",
    cat: "Estimating & Bidding",
    tags: ["margin", "cost", "analysis"],
    models: ["Any"],
    summary: "Compares estimated vs actual by cost code and ranks the recoverable leaks.",
    vars: [
      { k: "PROJECT", hint: "job name and job number" },
      { k: "ACTUALS", hint: "actual costs to date by cost code" }
    ],
    body: `ROLE: project controls analyst.

PROJECT: {{PROJECT}}
ACTUAL COSTS TO DATE: {{ACTUALS}}

TASK: Find margin leakage. Compare estimated vs actual by cost code and compute variance in both dollars and percent.

FORMAT:
- Table: Cost Code, Estimated, Actual, Variance $, Variance %, Forecast at Completion.
- TOP 5 LEAKS ranked by dollars.
- WHAT TO DO THIS WEEK — 5 actions, each with an owner and a dollar figure.

CHECK: Show every calculation. If actuals are missing for a cost code, mark it NEEDS INPUT rather than estimating it.`,
    notes: "Ask for the forecast-at-completion column even when it looks bad. That's the number that protects you."
  },
  {
    id: "change-order",
    title: "Change Order Request",
    cat: "Estimating & Bidding",
    tags: ["contracts", "writing", "collections"],
    models: ["Any"],
    summary: "Writes a change order as work, not as an argument — with an authorization block.",
    vars: [
      { k: "SCOPE_CHANGE", hint: "what changed, and when you found out" },
      { k: "TERMS", hint: "contract terms that matter, or NONE" }
    ],
    body: `ROLE: contracts writer for a concrete contractor.

CHANGE TO THE WORK:
{{SCOPE_CHANGE}}

TERMS TO RESPECT: {{TERMS}}

TASK: Draft a change order request that describes the change as work rather than an argument, documents why it was not in the original scope, states the schedule impact, and asks for written approval before proceeding.

FORMAT: Subject line, then Background / Change Description / Justification (why this is a change and not an error) / Schedule Impact / Cost Requested / Authorization block with signature lines.

CHECK: List the facts you need from me to make this enforceable — especially the original scope language this relies on. Do not invent contract references.`,
    notes: "If you don't have the original scope language, that's a conversation to have before you send this."
  },

  /* --------------------------- SITE OPERATIONS ------------------------- */
  {
    id: "daily-site-log",
    title: "Daily Site Log",
    cat: "Site Operations",
    tags: ["jobsite", "logging", "core"],
    models: ["Any"],
    fav: true,
    summary: "Rough field notes become a dated, five-section job log in one pass.",
    vars: [
      { k: "DATE", hint: "e.g. Tuesday 14 Oct" },
      { k: "NOTES", hint: "your raw voice-note or scribbled notes" }
    ],
    body: `TASK: Turn these rough site notes into a dated job log for {{DATE}}.

NOTES:
{{NOTES}}

FORMAT — five sections in this order, using only what I wrote:
1. What happened
2. Crew (names, count, trade)
3. Materials delivered, used, returned
4. Issues and delays (with the cause)
5. Next steps (each with an owner and a date)

CHECK: Mark anything a third party would ask about as [NEEDS DETAIL] rather than filling it in. Keep my terminology. Do not add work I didn't mention.`,
    notes: "Best used from your phone straight after a walk. Don't tidy the notes first — let the model do that."
  },
  {
    id: "photos-to-notes",
    title: "Photos to Field Documentation",
    cat: "Site Operations",
    tags: ["qa", "photos", "inspection"],
    models: ["Any", "Gemini", "Claude"],
    summary: "Converts site photos into QA entries, and won't guess a measurement from an image.",
    vars: [
      { k: "PHOTO_CONTEXT", hint: "what you're photographing and what to check" }
    ],
    body: `ROLE: QA inspector for concrete work.

TASK: Convert these photos into field documentation.

WHAT I'M PHOTOGRAPHING / WHAT TO CHECK:
{{PHOTO_CONTEXT}}

FORMAT — one entry per photo:
- Photo ref
- Location
- What it shows
- Condition (OK / Minor / Deficient / Unverifiable)
- Recommended action

CHECK: Only report what is visibly in the image. If the photo is too far, too dark, or cropped to judge a dimension, thickness, or finish quality, write "Unverifiable from photo" and tell me exactly which close-up shot I need. Never infer a measurement from a photo.`,
    notes: "Upload photos first, then this prompt. The Unverifiable rule is what keeps it defensible."
  },
  {
    id: "punch-list",
    title: "Punch List Builder",
    cat: "Site Operations",
    tags: ["qa", "closeout", "writing"],
    models: ["Any"],
    summary: "Rewrites loose punch notes as specific, verifiable actions with priority and owner.",
    vars: [
      { k: "AREA", hint: "the area or phase" },
      { k: "ITEMS", hint: "your rough punch list items" }
    ],
    body: `ROLE: project manager building a punch list for {{AREA}}.

RAW ITEMS:
{{ITEMS}}

TASK: Turn these into a client-ready punch list.

FORMAT:
- Table: #, Item, Location, Responsible Party (GC / Sub / Us), Priority (1 = must fix before payment), Status.
- Group by trade.
- Summary line: "N items, M by us, estimated days to clear."

CHECK: Rewrite each item as a specific, verifiable action — "patch and honeycombed area at column 3, east face" not "fix concrete." Flag any item too vague for a subcontractor to price.`,
    notes: "The vague-item flag is where the real argument savings are. Vague items become unpriced change orders."
  },
  {
    id: "safety-talk",
    title: "Tailgate Safety Talk",
    cat: "Site Operations",
    tags: ["safety", "jobsite", "writing"],
    models: ["Any"],
    summary: "Five-minute pre-task talk written so a concrete finisher will actually follow it.",
    vars: [
      { k: "SITE", hint: "site conditions and what's unusual today" },
      { k: "CREW", hint: "who's on site and what trade" },
      { k: "TOPIC", hint: "today's focus — e.g. cold weather placement" }
    ],
    body: `ROLE: safety coordinator.

SITE: {{SITE}}
CREW: {{CREW}}
TOPIC TODAY: {{TOPIC}}

TASK: Write a 5-minute pre-task tailgate talk.

FORMAT: One-sentence purpose, then 5 talking points in plain language that works without translation, then the 3 biggest hazards specific to today's work, then STOP WORK IF with the conditions that mean someone calls you before continuing.

CHECK: Under 400 words. Do not cite OSHA regulation numbers unless they genuinely apply, and if you do, name them correctly. End with a question that gets someone to speak.`,
    notes: "Keep it short. A long safety talk gets skipped by the exact people who most need to hear it."
  },

  /* --------------------------- FINANCE & CASH -------------------------- */
  {
    id: "invoice-followup",
    title: "Invoice Follow-Up",
    cat: "Finance & Cash",
    tags: ["invoicing", "collections", "email"],
    models: ["Any"],
    fav: true,
    summary: "Gets an invoice paid without threatening the relationship or inviting a fight.",
    vars: [
      { k: "INVOICE", hint: "invoice number, amount, original due date" },
      { k: "RELATIONSHIP", hint: "long-standing client / first invoice / contentious" }
    ],
    body: `ROLE: office manager for a small concrete contractor.

INVOICE: {{INVOICE}}
RELATIONSHIP: {{RELATIONSHIP}}

TASK: Write a payment reminder that gets paid without damaging the relationship.

RULES: Assume they intend to pay and something slipped on their end. Reference the invoice number, amount, and original due date. Give one specific easy way to resolve it. Short enough to read in 20 seconds.

FORMAT: Subject line, 3 short paragraphs, one clear ask, friendly sign-off.

CHECK: No threats, no interest charges, no collections warning — I escalate separately. Flag it if the amount is large enough that I should call instead of email.`,
    notes: "The 'call instead of email' flag is useful. Some invoices stop moving the moment a human calls."
  },
  {
    id: "cash-runway",
    title: "Cash Runway Check",
    cat: "Finance & Cash",
    tags: ["cash", "planning", "core"],
    models: ["Any"],
    summary: "Week-by-week runway with the week you run out stated up front.",
    vars: [
      { k: "CASH", hint: "cash on hand today" },
      { k: "WEEKS", hint: "e.g. 12" },
      { k: "COMMITMENTS", hint: "payroll, invoices, loans, known costs" }
    ],
    body: `ROLE: fractional CFO.

CASH ON HAND: {{CASH}}
WINDOW: next {{WEEKS}} weeks
COMMITTED COSTS: {{COMMITMENTS}}

TASK: Build the cash runway and tell me when I get in trouble.

FORMAT:
- Week-by-week table: Inflows, Outflows, Net, Ending Cash.
- RUNWAY ENDS — the week ending balance first drops below payroll, then below one week of overhead.
- MUST-DO THIS WEEK — the 5 actions that extend runway, each with a dollar impact.
- SHOULD I WORRY — one honest sentence.

CHECK: Show the math. Mark any week where I gave a range instead of a number as ASSUMED. If the runway ends inside the window, put that at the very top before anything else.`,
    notes: "Run it with pessimistic numbers, not hopeful ones. The gap between the two runs is your actual risk."
  },
  {
    id: "monthly-close",
    title: "20-Minute Month-End Review",
    cat: "Finance & Cash",
    tags: ["review", "numbers", "habit"],
    models: ["Any"],
    fav: true,
    summary: "Turns month-end numbers into a review you can actually finish on a Friday.",
    vars: [
      { k: "MONTH", hint: "e.g. September 2026" },
      { k: "NUMBERS", hint: "revenue, costs, bank balance, AR, AP" }
    ],
    body: `ROLE: business owner doing a 20-minute month-end review.

MONTH: {{MONTH}}
NUMBERS: {{NUMBERS}}

TASK: Turn these into a review I can finish in 20 minutes.

FORMAT:
1. What happened — revenue, gross margin, net, vs last month and vs the same month last year.
2. What caused it — top 3 positive and top 3 negative, each with the dollar impact.
3. What I should change — 5 actions, each with an owner and a deadline.
4. Questions I should be asking — 5 questions for my bookkeeper, accountant, or estimator.

CHECK: Don't invent numbers. If I'm missing a comparison figure, write NEEDS INPUT and keep going. End with "THE ONE NUMBER TO WATCH NEXT MONTH" and say why.`,
    notes: "Section 4 is the underrated part. It's how you turn a review into answers instead of opinions."
  },
  {
    id: "job-cost-explainer",
    title: "Job Cost Explainer",
    cat: "Finance & Cash",
    tags: ["cost", "analysis", "lessons"],
    models: ["Any"],
    summary: "Explains a finished job's numbers to a non-accountant, and separates overrun from underbilling.",
    vars: [
      { k: "JOB", hint: "job name and number" },
      { k: "COSTS", hint: "budget and actual by cost code" }
    ],
    body: `ROLE: project accountant.

JOB: {{JOB}}
COSTS: {{COSTS}}

TASK: Explain what actually happened on this job.

FORMAT:
- One plain-English paragraph a non-accountant can follow.
- Table by cost code: budget, actual, variance.
- WHERE IT WENT — the 3 cost codes with the largest overrun, one sentence of cause each.
- THE LESSON — the single process change that would have caught it.

CHECK: Distinguish cost overruns (we spent more) from revenue shortfalls (we didn't bill, or didn't charge enough). They are different problems with different fixes. If you can't tell which happened, say so.`,
    notes: "Most 'cost overruns' are actually underbilling. This prompt forces the distinction."
  },

  /* -------------------------- SALES & PRESALES ------------------------- */
  {
    id: "discovery-questions",
    title: "Discovery Questions (Bid-Ready)",
    cat: "Sales & Presales",
    tags: ["discovery", "estimating", "sales"],
    models: ["Any"],
    summary: "Questions that scope a job accurately enough to price, ordered by disqualifying risk.",
    vars: [
      { k: "DEAL", hint: "what the project is and what you know so far" }
    ],
    body: `ROLE: senior estimator on a discovery call.

DEAL: {{DEAL}}

TASK: Write the questions I need to ask to scope this job accurately enough to bid it.

FORMAT — group into:
1. Scope — what's being built, and explicitly what is excluded
2. Access & logistics — site conditions, work hours, staging, crane or pump access
3. Constraints — real timeline, budget reality, other trades already committed
4. Decision — who signs, and the actual bid deadline

For each question add a one-line note on what a bad answer would cost me.

RULES: Ask about exclusions directly. Never ask the client to solve a construction problem for me. Maximum 15 questions, with the ones that could disqualify the job first.

CHECK: Flag the 3 questions where the answer most changes the price.`,
    notes: "The 'what a bad answer would cost me' note is what makes you actually listen to the answers."
  },
  {
    id: "proposal-writer",
    title: "Proposal Writer",
    cat: "Sales & Presales",
    tags: ["proposal", "writing", "core"],
    models: ["Any"],
    fav: true,
    summary: "A sendable proposal from your line items. You supply every number; it never invents one.",
    vars: [
      { k: "CLIENT", hint: "client name and project" },
      { k: "LINE_ITEMS", hint: "your line items with prices" },
      { k: "TERMS", hint: "payment terms, retainage, schedule terms" }
    ],
    body: `ROLE: proposal writer for a concrete contractor.

CLIENT: {{CLIENT}}
LINE ITEMS WITH MY PRICES: {{LINE_ITEMS}}
TERMS: {{TERMS}}

TASK: Write a proposal I can send as-is.

FORMAT: Cover paragraph (2 sentences, name them), Scope of Work (plain language, grouped by phase), What's Included, What's Excluded (be generous — this protects the margin), Schedule, Price, Terms, Acceptance block with signature lines.

RULES: I supply every number. Do not invent, round, or adjust any price, quantity, or date. Write exclusions as facts, not as warnings.

CHECK: Before drafting, list what you need from me that's missing. Put acceptance language last and keep it plain.`,
    notes: "Run the output through 'hostile-review' before sending. Catches tone problems and invented numbers."
  },
  {
    id: "win-loss-review",
    title: "Win / Loss Review",
    cat: "Sales & Presales",
    tags: ["review", "sales", "lessons"],
    models: ["Any"],
    summary: "Post-mortem that won't let you rationalize a loss as price.",
    vars: [
      { k: "DEAL", hint: "the deal, who decided, timeline" },
      { k: "OUTCOME", hint: "won / lost, and what you were told" }
    ],
    body: `ROLE: sales manager reviewing a closed deal.

DEAL: {{DEAL}}
OUTCOME: {{OUTCOME}}

TASK: Tell me the truth about why this happened, in a form I can act on.

FORMAT:
1. One-paragraph verdict.
2. What we did well — 3 things, with evidence from the deal.
3. What actually decided it — not what I told myself decided it.
4. What I do differently next time — 3 changes, specific enough to start Monday.
5. The one pattern this deal belongs to, if any.

RULES: If we lost, don't call it price unless price is genuinely the reason. If we won, don't assume it was the relationship.

CHECK: Separate what you know from what you're inferring, and label which is which.`,
    notes: "'What I was told' and 'what decided it' are usually different. That gap is the useful part."
  },

  /* -------------------------- PMO & LEADERSHIP ------------------------- */
  {
    id: "exec-summary",
    title: "Executive Summary",
    cat: "PMO & Leadership",
    tags: ["writing", "comms", "summary"],
    models: ["Any"],
    summary: "Long document to five bullets and one specific ask.",
    vars: [
      { k: "DOC", hint: "the report, plan, or research" },
      { k: "AUDIENCE", hint: "who reads it and what they control" }
    ],
    body: `TASK: Turn the material below into an executive summary.

AUDIENCE: {{AUDIENCE}}

MATERIAL:
{{DOC}}

FORMAT:
1. Five bullets maximum — the decision or the headline.
2. WHAT IT MEANS — 3 short paragraphs.
3. WHAT I'M ASKING FOR — the specific decision, owner, and date. Or "no decision needed."
4. DETAIL ON REQUEST — a one-line pointer to the section behind each bullet.

RULES: No jargon. No hedging. If the material doesn't support a conclusion, say the honest version instead of manufacturing one.

CHECK: If you didn't have enough to summarize, say so in one line.`,
    notes: "If you can't name who reads it and what they control, don't write the summary yet."
  },
  {
    id: "decision-memo",
    title: "Decision Memo",
    cat: "PMO & Leadership",
    tags: ["decisions", "writing", "strategy"],
    models: ["Any"],
    summary: "A memo that produces a decision, with a recommendation instead of a menu.",
    vars: [
      { k: "DECISION", hint: "the decision and the deadline" },
      { k: "OPTIONS", hint: "the options and rough costs" }
    ],
    body: `ROLE: advisor writing a decision memo.

DECISION: {{DECISION}}
OPTIONS: {{OPTIONS}}

TASK: Write the memo that gets a decision made this week.

FORMAT:
1. Decision required, in one sentence, with the deadline.
2. Recommendation up front — my call, not a survey.
3. Options table: cost, timeline, risk, reversibility.
4. The strongest argument against my recommendation.
5. What would change my mind.

RULES: Don't hedge. Don't present options as a neutral menu when I asked for a recommendation. Flag any option that is cheap and reversible, because those usually don't need a memo at all.

CHECK: Tell me if this decision doesn't actually need to be made, or if I already have enough information.`,
    notes: "Point 5 is what keeps this honest. Without it you get a memo that argues its own conclusion."
  },
  {
    id: "status-update",
    title: "Client Status Update",
    cat: "PMO & Leadership",
    tags: ["comms", "clients", "projects"],
    models: ["Any"],
    summary: "Project update that reports bad news in the first line instead of paragraph four.",
    vars: [
      { k: "PROJECT", hint: "project name" },
      { k: "UPDATE", hint: "this period's raw update" }
    ],
    body: `ROLE: PMO lead writing a client status update.

PROJECT: {{PROJECT}}
THIS PERIOD: {{UPDATE}}

TASK: Write the update I send to the client.

FORMAT: Overall status (RAG word plus one sentence), then Schedule (what moved, what's committed), Quality, Cost, then Items needing a client decision — numbered, each with what's needed and by when.

RULES: Report bad news in the same tone as good news. Never bury a slip in a paragraph of progress. If status is red, the word RED goes in the first line.

CHECK: Every number must come from my update. Mark anything I left out as MISSING. Under 350 words.`,
    notes: "Clients forgive slips. They don't forgive finding out late from someone else."
  },

  /* ------------------------ WRITING & CONTENT -------------------------- */
  {
    id: "linkedin-post",
    title: "LinkedIn Post (No Fluff)",
    cat: "Writing & Content",
    tags: ["social", "writing", "marketing"],
    models: ["Any"],
    summary: "A post that opens with a real number instead of an industry hook line.",
    vars: [
      { k: "TOPIC", hint: "what you want to talk about" },
      { k: "AUDIENCE", hint: "GCs, other contractors, or your own crew" },
      { k: "ANGLE", hint: "the opinion you actually hold" }
    ],
    body: `ROLE: ghostwriter for a concrete contractor who writes about running a real business.

TOPIC: {{TOPIC}}
AUDIENCE: {{AUDIENCE}}
MY ACTUAL ANGLE: {{ANGLE}}

TASK: Write a post under 200 words.

RULES: Open with the specific moment or number, not a hook about "the industry." One idea. Short paragraphs of one or two sentences. No emoji. No "excited to announce." No fake vulnerability. No "agree?" engagement bait. Take a position a peer could disagree with.

FORMAT: The post, then 3 hashtag suggestions, then a one-line follow-up post for next week that extends it.

CHECK: If the topic can't be made specific without inventing a story, tell me that instead of writing fiction.`,
    notes: "Fill ANGLE with your real opinion. Empty it and you'll get the same post everyone else writes."
  },
  {
    id: "email-draft",
    title: "Email Draft",
    cat: "Writing & Content",
    tags: ["email", "comms", "writing"],
    models: ["Any"],
    summary: "Short, plain business email with one ask.",
    vars: [
      { k: "SITUATION", hint: "who, what, and what you need" },
      { k: "TONE", hint: "firm / friendly / neutral / urgent" }
    ],
    body: `ROLE: write this email for me.

SITUATION: {{SITUATION}}
TONE: {{TONE}}

FORMAT: Subject line, then 4 short paragraphs maximum, then one specific ask or next step, then sign-off.

RULES: The shortest version that still makes the point. No "I hope this email finds you well." No sentence I'd be embarrassed to read out loud. One ask, not five.

CHECK: Before drafting, tell me in one line what you're missing that would change the email. Then draft.`,
    notes: "The up-front gap check is worth the extra round trip. It stops a wasted email."
  },
  {
    id: "simplify-this",
    title: "Simplify This",
    cat: "Writing & Content",
    tags: ["editing", "writing"],
    models: ["Any"],
    summary: "Cuts a draft down without losing your voice or any number.",
    vars: [
      { k: "TEXT", hint: "your draft" }
    ],
    body: `Rewrite the text below so a smart 15-year-old could follow it.

TEXT:
{{TEXT}}

RULES: Cut every sentence that isn't carrying weight. Replace jargon with the plain word. Keep every number, name, and date exactly as written. Keep my voice — this is my writing, not yours.

FORMAT: The rewritten text, then a one-line note on the biggest cut you made and why.

CHECK: If the original is unclear because information is missing, don't smooth over the gap — tell me what's missing.`,
    notes: "Good for specs and proposals, where clarity and fewer change orders are the same goal."
  },
  {
    id: "content-repurpose",
    title: "Content Repurposing (1 to 6)",
    cat: "Writing & Content",
    tags: ["content", "marketing", "writing"],
    models: ["Any"],
    summary: "One piece of material becomes six genuinely different pieces.",
    vars: [
      { k: "SOURCE", hint: "a long email, article, or call transcript" }
    ],
    body: `ROLE: content repurposer.

SOURCE:
{{SOURCE}}

TASK: Turn this into 6 pieces, each a different format and a different audience, so nothing repeats itself.

FORMAT — one per section:
1. LinkedIn post — contractor / GC audience
2. Short client email — client audience
3. Five-slide talk outline — industry audience
4. One-paragraph website explainer — prospect audience
5. Three questions a reader should ask themselves — FAQ or self-check
6. One contrarian take that would annoy some people but be defensible

RULES: Each piece must be genuinely different, not the same content under a new headline. Don't invent facts I didn't give you.

CHECK: List any piece this source could have supported but couldn't, because the material wasn't there.`,
    notes: "Point 5 turns content into something useful, which is what makes people share it."
  },

  /* ------------------------ PERSONAL & UTILITY ------------------------- */
  {
    id: "summarize-bullets",
    title: "Summarize in Bullets",
    cat: "Personal & Utility",
    tags: ["summary", "core", "utility"],
    models: ["Any"],
    fav: true,
    summary: "The workhorse summary. Never fills in a number you didn't give it.",
    vars: [
      { k: "TEXT", hint: "the email, contract, spec, or article" },
      { k: "FOCUS", hint: "what matters most for this read" }
    ],
    body: `Summarize the text below in bullets.

TEXT:
{{TEXT}}
FOCUS — what matters most: {{FOCUS}}

Group under:
- What's asked
- Key numbers and dates
- Decisions needed
- Risks or red flags
- My action items with deadlines

CHECK: Write MISSING for any number, date, or name I left out that I'd need. Do not infer a number that isn't stated. Keep my terminology — don't upgrade casual language into formal language.`,
    notes: "The most-used prompt in the library. Keep FOCUS specific or you get a generic summary."
  },
  {
    id: "meeting-notes",
    title: "Meeting Notes to Record",
    cat: "Personal & Utility",
    tags: ["meetings", "comms", "utility"],
    models: ["Any"],
    summary: "Rough notes into a record with decisions, owners, and dates.",
    vars: [
      { k: "NOTES", hint: "your scribbles or voice note" }
    ],
    body: `TASK: Turn these rough meeting notes into a clean record.

NOTES:
{{NOTES}}

FORMAT: Title and date, Attendees, Decisions made (numbered, with who decided), Open questions (with owner), Action items (table: Action | Owner | Due date | Status), Parking lot.

RULES: An action item needs an owner and a date. If the notes don't say, write UNASSIGNED or NO DATE — don't leave it blank, and don't assign it to me by default.

CHECK: List anything that sounded like a decision but wasn't clearly one, so I can confirm it.`,
    notes: "Sending this summary to attendees is what turns a meeting into commitments."
  },
  {
    id: "voice-to-email",
    title: "Voice Note to Email",
    cat: "Personal & Utility",
    tags: ["email", "utility", "writing"],
    models: ["Any"],
    summary: "Dictated rambling cleaned into a short professional email, keeping every fact.",
    vars: [
      { k: "TRANSCRIPT", hint: "your dictation or voice note transcript" }
    ],
    body: `Clean up this dictation into a short, professional email.

DICTATION:
{{TRANSCRIPT}}

RULES: Fix the rambling. Keep every fact and number. Remove filler and false starts. Use complete sentences. Sound like a competent person typing quickly, not like a lawyer. Under 200 words. Do not add information I didn't say.

FORMAT: The finished email only. If the dictation covered more than one distinct topic, output separate emails with short subject lines.`,
    notes: "Built for dictating between jobsites. Keep the no-added-information rule or it will start inventing details."
  },
  {
    id: "pre-mortem",
    title: "Pre-Mortem",
    cat: "Personal & Utility",
    tags: ["planning", "risk", "strategy"],
    models: ["Any"],
    fav: true,
    summary: "Assume it already failed, then write how. Surfaces risks that normal planning hides.",
    vars: [
      { k: "PROJECT", hint: "the plan, launch, or hire" },
      { k: "TIMELINE", hint: "the target date or period" }
    ],
    body: `ROLE: skeptical advisor.

PROJECT: {{PROJECT}}
TIMELINE: {{TIMELINE}}

TASK: Run a pre-mortem. Assume {{TIMELINE}} already failed. Write the story of how it failed.

FORMAT:
- 200 words, past tense, written as though it already happened.
- Then the 5 most likely causes, each with the earliest warning sign that would have told me.
- Then PREVENTABLE BY — for each cause, the one action that would have headed it off, and whether it costs money.

RULES: Be specific and make it uncomfortable. Generic risks like "communication issues" are useless — name the meeting, the person, the number. Don't reassure me.

CHECK: Rank everything by probability times damage, and tell me which single item I should worry about most.`,
    notes: "Far more productive than 'what could go wrong'. Naming a specific failure is easier to prevent."
  },
  {
    id: "hostile-review",
    title: "Hostile Review of an Answer",
    cat: "Personal & Utility",
    tags: ["review", "quality", "guardrails"],
    models: ["Any"],
    fav: true,
    summary: "Run before you send or ship. Finds the flaw before your client does.",
    vars: [
      { k: "DRAFT_ANSWER", hint: "the AI output, email, or doc to stress-test" }
    ],
    body: `You are a hostile reviewer. Your job is to find what is wrong with the answer below before somebody else does.

ANSWER:
{{DRAFT_ANSWER}}

FORMAT:
- Table: Problem | Severity (Critical/Major/Minor) | Why it's wrong
- WHAT I CANNOT VERIFY — claims made without support
- THE STRONGEST CHALLENGE — the smartest objection a skeptical reader would raise
- SHIP IT? — Yes, Yes after fixes, or No

RULES: Don't rewrite it. Don't soften findings to be polite. If the answer is genuinely correct, say so plainly and tell me what to double-check before trusting it.

CHECK: Quote the specific sentence or number behind every finding.`,
    notes: "The guardrail habit. Works on any AI output, not just this library's prompts."
  }
];