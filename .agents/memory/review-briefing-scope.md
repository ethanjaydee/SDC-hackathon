---
name: Review briefing scope
description: Improvement briefing summarizes low-rated feedback only.
---
The Improvement briefing must use the mock values in “Sample reviews by job level” and summarize their overall 1- and 2-star reviews across all technicians and job levels. It must not require saving reviews or switch to a saved-review source. Display filters must not narrow its input.

**Why:** The user asked for low-rating-only AI summaries, then clarified: “i dont want save review, just use the overall low rating review” and “just take the mock value in the sample reviews by job level”.

**How to apply:** Exclude 3–5-star feedback before AI invocation; show complaint themes and improvements, not a positive-feedback section. Do not save reviews as part of generation. Clearly label the existing review examples and their summaries as illustrative.

Verify AI briefing changes with the full mock review collection shown on the page, not just a tiny hand-written sample.

**Why:** A two-review live check succeeded while the full collection produced model output rejected by the old display-limit validation. A successful small sample did not demonstrate that the page's real request worked.

**How to apply:** Derive verification input from the same review source and current technician roster used by the page, and confirm the API accepts the resulting live AI response.
