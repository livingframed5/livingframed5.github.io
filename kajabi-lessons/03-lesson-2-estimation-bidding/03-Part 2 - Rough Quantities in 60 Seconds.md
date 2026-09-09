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
