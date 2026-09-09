# Lesson 2 — Estimation & Bidding with AI

**Time:** ~45 minutes
**Tools:** A chat AI tool (any) + a basic calculator. No software to install.

> **IMPORTANT — read this first:** AI is a *speed tool for estimating, not a license to skip the
> math.* Your bid is a legal promise. AI gets quantities wrong when it has to guess your slab
> details, your labor, or your local prices. The workflow below makes AI the fast drafter and YOU
> the final calculator. The rule: **AI builds the skeleton, you check every bone.**

---

## What You'll Learn

By the end of this lesson you can:

- Rough-in material quantities from basic job facts without starting from zero.
- Turn a spec or scope paragraph into a clean line-item bid structure.
- Draft a professional, complete bid proposal in minutes.
- Build a "bid prompt file" you reuse on every job so bids are consistent.

---

## Part 1 — The Estimator's Golden Rules for AI

Three rules that keep you out of trouble:

1. **Give it the numbers — don't let it invent them.** You supply sq ft, thickness, psi,
   rebar spacing, site conditions. Every assumption the AI makes, it must flag.
2. **Use AI for structure and arithmetic-checking, not for magic.** It can build the line-item
   list and even do the math on YOUR inputs. It can't know your local ready-mix price or your
   crew's productivity. You supply those.
3. **Round everything up to a margin.** Even with AI, estimate conservatively. Waste factor
   (5–10%), re-pour risk, access. AI won't know your region's waste — you do.

---

## Part 2 — Rough Quantities in 60 Seconds

Start with a great "quantity drafter" prompt. Fill in YOUR facts, let AI organize and calculate,
then sanity-check.

> "You are a concrete estimator's assistant. Build a rough material list for this job:
> - Area: 6,000 sq ft, slab on grade, 4-inch thick.
> - Strength: 4,000 psi mix.
> - Reinforcing: rebar on 18-inch centers each way (assume #4).
> - Use standard industry waste factor for concrete (add it and tell me the %).
> Return a table: item | how to calculate | quantity | unit. Then total the concrete in cubic
> yards. Flag every assumption you made in a 'CHECK WITH ESTIMATOR' note."

**What it should produce:** sq ft × 0.33 ft = 2,000 cu ft ÷ 27 = ~74 cu yd, plus waste → ~79 yd.
**Your job:** confirm 4-in. is right, your local waste factor, and that the mix/spec matches the
drawing. Don't paste a drawing — describe it. If you want a 6-in. slab, change "4-inch" to "6-inch".

**Advanced trick:** take a photo of a dimensioned sketch/plan (the layout, not blueprints) and ask:

> "Describe what you see in this sketch: rooms/slabs, and rough dimensions you can read. List any
> dimensions that are cut off or unclear. Do NOT calculate anything yet."

The AI reads the drawing; *you* correct it; *then* you run the quantities prompt with corrected
facts. This is how you use the photo feature safely.

---

## Part 3 — Spec → Bid Structure in One Pass

GCs send paragraphs of scope. Turn that paragraph into a line-item bid without retyping.

> "You are a bid coordinator. Turn this scope description into a clean line-item bid structure
> with categories (Mobilization, Site prep, Concrete supply, Place & finish, Reinforcing,
> Cutting/sealing, Cleanup, Allowances). Use only what's in the scope — do not add items.
> If something is vague, put it in an 'UNSURE — ASK GC' list.
> Scope: [paste the scope text]."

The output is your skeleton. Then add your prices line by line (materials per yd, labor per
square foot or per man-day, equipment, trucking, pump, etc.). AI did the *organizing*; you did
the *pricing*.

---

## Part 4 — Draft the Full Bid Proposal (the "money" prompt)

Once the scope and quantities are settled, draft the professional proposal.

> "You are a proposal writer for a concrete contractor. Create a bid proposal from this data:
> - Client: [name], [property/site].
> - Scope: [list of line items + amounts you've priced].
> - Total: $[amount].
> - Terms: 50% deposit to schedule, balance on completion; valid 30 days; concrete pours weather
>   permitting; work per attached specs.
> Format: professional 1-page proposal with sections — Scope of Work, Price, Schedule, Inclusions,
> Exclusions, Terms & Acceptance. Sign and date line at the bottom."

**After the draft:** read it out loud. Add anything specific to the job (access, power,
water, cleanup route, punch list). Delete AI's generic boilerplate that doesn't apply. This is
where you add the value that wins the job.

---

## Part 5 — Build Your "Bid Prompt File" (reusable asset)

This is the highest-leverage habit in this module. Create one Notes doc (or a Word file) called
**BID FILE** with your saved prompts:

1. The quantities prompt (Part 2).
2. The spec-to-bid prompt (Part 3).
3. The proposal prompt (Part 4).
4. Your **company facts block** to paste into every job prompt:

> "Company facts: Lakeview Concrete — family-owned, 12 years in business, licensed & insured
> (license #[...]), serving [counties]. We specialize in flatwork, stamped and exposed aggregate,
> and foundations. Typical labor rates: $[x]/sq ft place & finish; [x]/man-day for crew; concrete
> supply cost from local plant at $[x]/yd delivered."

Paste the facts block + the job facts into any prompt. Your bids suddenly all sound like you —
consistent, professional, fast.

---

## Try It Yourself (7 minutes)

1. Take a real upcoming job (or a past one you can redo).
2. Run the quantities prompt with your real numbers. Check the math on paper.
3. Run the proposal prompt and produce a full draft bid.
4. Note 3 things you'd never let AI decide alone on this job.

---

## Lesson 2 Checklist

- [ ] You can rough-in quantities from basic facts and verify them by hand.
- [ ] You've turned a scope paragraph into a line-item structure.
- [ ] You've drafted at least one full bid proposal with AI, then edited it.
- [ ] You've started a reusable BID FILE with your company facts block.
- [ ] You know exactly which numbers are YOURS (prices, waste, labor) vs AI's (structure, drafts).

---

## Quick Reference Card — Bidding Prompts

```
QUANTITIES → ROLE: estimator's assistant. FACTS: area, thickness, psi, rebar, waste %. TASK: table + total yards. CHECK: flag assumptions.
DRAWING   → "Describe what you see; list dimensions; flag anything cut off. Do NOT calculate."
SCOPE→BID → "Turn this scope into line items by category. Don't add items. List UNSURE items separately."
PROPOSAL  → ROLE: proposal writer. DATA: client, line items + prices, total, terms. FORMAT: 1-page sections + acceptance line.
GOLDEN RULE → AI builds the skeleton. You price, you check, you own the number.
```