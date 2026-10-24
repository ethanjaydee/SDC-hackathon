# Dispatch Hub — “Every handoff, in view”

## Director's treatment
- **Promise:** Show one synthetic service request moving from customer conversation through diagnosis, qualified dispatch, field completion, and workshop insight—while making clear that Boss and Technician are demo views, not real security or live GPS.
- **Identity:** Dispatch Hub's signal-paper palette: bone, graphite, vermilion, with restrained sea-glass green for completed work. Bricolage Grotesque display, Geist-like sans, JetBrains Mono labels.
- **Hero:** The Dispatch Hub interface itself, treated as a kinetic control surface; a vermilion work-order tile is the continuity carrier.
- **Motion:** Macro-to-overview camera pushes, split-screen role contrast, and shape-matched panel wipes that preserve the work-order tile across cuts.
- **Arc:** Immediate product hook, rapid system overview, measured diagnosis/dispatch payoff, then broaden into field operations and workshop analytics before resolving on the full workflow.
- **Payoff:** The final service-history line draws itself through a compact system map and resolves into the plain Dispatch Hub name, unlike the interface-led middle.
- **Format:** 16:9 landscape.

## Timeline

| Time | Viewer's focus | Motion event | Composition | Handoff |
| --- | --- | --- | --- | --- |
| 0–5.05s | Dispatch Hub + two demo roles | Role tiles snap into a split view | Wide split / interface surfaces | Boss overview tile becomes metric card |
| 5.05–10.40s | Boss overview | Readiness ring resolves; roster and jobs orbit into frame | Spacious overview grid | Vermilion job marker expands into inbox row |
| 10.40–15.50s | Work Order + AI/rule diagnosis | Conversation bubbles stack; issue/parts get annotated | Tight transcript to analysis split | Route pin punches through to map |
| 15.50–20.00s | Route, eligibility, dispatch approval | Route draws; tech and van join; approval locks green | Map-first centered composition | Green dispatch stamp folds into field card |
| 20.00–25.05s | Technician field view | Active job and completion proof resolve | Asymmetric phone-like job panel | Van silhouette carries to transport |
| 25.05–30.00s | Shared transport / inventory | Stock rows reorder; low-stock signal becomes reserved parts | Horizontal inventory strip | Part-chip circle opens service log |
| 30.00–35.50s | Service history + sample reviews | Timeline traces completed jobs; stars tally | Editorial split between log and review | Star expands into analytic chart point |
| 35.50–40.00s | Workshop analysis + complete workflow | Revenue/usage charts draw, route line stitches workflow | Full-width chart field to centered lockup | Last route line curves into first role split |

## Shot-by-shot script

### Shot 01 / 00.00–05.05s / 5.05s — “ONE HUB. TWO DEMO VIEWS.”
**Purpose:** Establish the product, its two role perspectives, and the synthetic-demo boundary immediately.

**Composition and artistic idea:** Bone-paper field with a clipped, dark graphite interface slab spanning the center. A vermilion work-order tile is the hero and continuity carrier. Two role panes own left and right halves: Boss / Dispatch CEO and Technician / Field view. Small persistent footer: “Synthetic demo data · Role choice is not real account security.” Subtle grain, orange rule and tabular metadata borrow the source UI's signal-paper language.

**Exact copy and holds:** 0.00 “Dispatch Hub” small identity at upper-left; 0.15 “THE HANDOFF, IN VIEW.” large across upper center; 0.70 “Boss” / “Dispatch CEO” at left; 1.15 “Technician” / “Field view” at right; 1.80 “Demo role selection. No password. No real account security.” footer; 2.40 “Themes · light / night / cyberpunk / comfort-reading.” All hold until exit.

**Choreography:** 0.00–0.35s vermilion work-order tile is already half visible and snaps into focus; 0.40–0.90s two role panes unfold from its edges in opposite directions; 1.00–1.50s Boss role icon and Technician role icon land in distinct panels; 1.55–2.20s the work-order tile duplicates as a pair of tiny linked markers then recombines centrally; 2.40–3.25s demo notice underlines in one orange draw; 3.40–4.15s camera pushes into the left pane, while right pane folds behind it; 4.15–5.00s the readiness ring enters as a circular match from the tile's center.

**Transition contract:** The centered vermilion tile contracts into the Overview readiness ring. Overlap final 0.22s; the ring's circular crop and a diagonal panel fold combine with a short type shear.

**Assets and technique:** Interface built with SVG/CSS and Framer Motion; no screenshots or invented brand logo. Existing source fonts are referenced by the product identity; demo disclaimer stays readable.

**Sound intent:** Instrumental corporate-electronic groove, around 120 BPM, crisp kick and restrained handclap; intended cut at 5s on beat, to verify against the generated audio.

### Shot 02 / 05.05–10.40s / 5.35s — “READINESS, AT A GLANCE.”
**Purpose:** Introduce Boss overview: readiness, roster, dispatch activity, operational pulse.

**Composition and artistic idea:** The readiness ring occupies the left-center as a large focal gauge; right side is a cropped roster column. Three compact KPI strips sit below, not equal cards. A parchment interface field with one graphite sidebar. Content reads “Technician readiness”, “Ready to roll 4 / 6”, “Dispatch activity”, “Open work orders 8”, “Parts to restock 3”. These are illustrative demo UI values, not live service claims.

**Exact copy and holds:** 5.05 “BOSS OVERVIEW”; 5.40 “Ready to roll” / “4 / 6”; 6.35 “Technician readiness”; 7.15 roster labels “Available”, “Busy”, “On the roster”; 8.05 “Dispatch activity”; 8.75 tiny footnote “Illustrative synthetic values”. Hold key labels through 9.55.

**Choreography:** 5.05–5.60s ring expands from prior tile; 5.60–6.35s its vermilion arc draws to 4/6 while the number ticks in; 6.35–7.15s roster rows translate into their slots one by one, with available/busy status dots; 7.15–8.15s camera glides right to reveal activity count and a small trend line; 8.15–8.85s an activity row receives a vermilion edge; 8.85–9.50s the selected row stretches into a full-width work-order ribbon; 9.50–10.40s ribbon punches toward camera.

**Transition contract:** The highlighted activity row becomes the incoming inbox row at identical scale and angle. Hard beat cut plus a masked panel unfolding; its left badge remains the carrier.

**Assets and technique:** SVG readiness circle; custom DOM interface plates; 3 fixed roster initials and distinct availability colors; motion graphics only.

**Sound intent:** Continue bed; cut at 10s on a 120-BPM beat, pending onset check.

### Shot 03 / 10.40–15.50s / 5.10s — “FROM MESSAGE TO JOB BRIEF.”
**Purpose:** Show Work Order inbox and the conversation-to-diagnosis workflow, including that analysis is suggested, not unquestionable.

**Composition and artistic idea:** Left two-thirds are a darkened message transcript with sender-role labels; right third is a bright diagnosis panel. The same vermilion badge identifies a fictional customer conversation. Messages are “The AC is blowing warm air.” and “The filter was changed last month.” The panel reads “Suggested issue · Rule-based analysis”, “AC cooling fault”, required parts “Capacitor” and “Air filter”, “Normal urgency”. Small note: “AI suggestions need your review.” Avoid pretending analysis came from AI.

**Exact copy and holds:** 10.40 “WORK ORDER”; 10.85 customer message “The AC is blowing warm air.”; 11.55 customer follow-up “Filter changed last month.”; 12.25 “Suggested issue”; 12.60 “AC cooling fault”; 13.30 “Required parts” / “Capacitor” / “Air filter”; 14.05 “Normal urgency”; 14.60 “Review the suggestion before dispatch.” Hold until the route punch.

**Choreography:** 10.40–10.90s ribbon settles as inbox thread; 10.90–11.55s first customer bubble is revealed by a horizontal text mask; 11.55–12.10s second bubble arrives lower and shortens the prior bubble; 12.10–12.85s camera crops into the diagnosis pane as issue words replace the chat sender label; 12.85–13.65s part chips stamp in sequentially; 13.65–14.55s urgency badge rotates from edge-on and settles amber; 14.55–15.05s review note appears; 15.05–15.50s a map pin scales through the lens, with transcript and analysis splitting diagonally behind it.

**Transition contract:** The circular map pin carries across the cut and lands at the map's customer site. Pin scale-through plus two-panel split and type slice exit; overlap 0.20s.

**Assets and technique:** SVG chat bubbles, diagnosis card, parts chips and pin; all values are fictional demo content. Use a careful label marking rule-based suggestion in the shown example.

**Sound intent:** Groove continues; planned cut at 15s.

### Shot 04 / 15.50–20.00s / 4.50s — “QUALIFIED. ROUTED. APPROVED.”
**Purpose:** Convey synthetic map, qualified technician recommendation, van/parts check, and manager approval dispatch sequence.

**Composition and artistic idea:** A schematic map dominates center; two site markers and graphite route line create a drawn circuit. A slim right rail lists “Technician · Mira Tan”, “Van · Van 04”, “Parts reserved”, with a horizontal approval slider rendered as noninteractive artwork. This is explicitly “Demo map · not live GPS”. A green dispatch state appears only after the approval beat.

**Exact copy and holds:** 15.50 “MATCH THE JOB TO THE CREW”; 15.95 map labels “Workshop” and “Customer site”; 16.75 “Qualified technician · Level 2+”; 17.55 “Shared van · eligible stock”; 18.35 “Approval checks availability + stock”; 19.05 “DISPATCH RECORDED”; 19.65 “Van allocated · parts reserved”; 19.95 “Synthetic map · not live GPS”. Last labels hold into transition.

**Choreography:** 15.50–15.95s site pin lands from previous scene; 15.95–16.65s route traces in two bends, not a generic straight line; 16.65–17.40s recommendation card unfolds from the path's midpoint; 17.40–18.15s van chip locks next to tech; 18.15–18.90s noninteractive approval track fills with a warm orange scan; 18.90–19.45s status flips to sea-glass green and reserved-parts chips appear; 19.45–19.75s map folds into a vertical job card; 19.75–20.00s field-card silhouette carries forward.

**Transition contract:** Green approval stamp becomes the technician's active-job status dot. Route line doubles as a fold crease; color field changes from map-paper to graphite while scene planes cross in perspective.

**Assets and technique:** Schematic-only synthetic map, SVG route/path; no geographic precision, GPS assertion, or live locations. Illustrated card controls are noninteractive.

**Sound intent:** Main musical lift sits around the 18.4s dispatch reveal, then cut at 20.0s on a measured onset.

### Shot 05 / 20.00–25.05s / 5.05s — “THE FIELD VIEW.”
**Purpose:** Show the Technician's limited role view, active jobs, completion flow, sample record and shared transport entry.

**Composition and artistic idea:** A tall phone-like interface plane occupies right-center (within the widescreen safe field); left side carries oversized “YOUR DAY” text. The card reads “Active jobs · 1”, “#4821 · Cedar Court”, “Parts: capacitor, filter”, then completion-proof thumbnail tiles labeled “Before” and “After”, a visual completion control and “Job completed”. A bottom strip shows “Sample record · illustrative only”.

**Exact copy and holds:** 20.00 “TECHNICIAN VIEW”; 20.45 “Your day”; 21.05 “Active jobs · 1”; 21.55 “Demo customer · Puchong”; 22.10 “Parts reserved for this job”; 22.75 “Completion proof”; 23.35 “Before / After”; 23.90 “Complete job”; 24.45 “Sample record · fictional profile”. Only one active job status changes to completed; no real customer or proof.

**Choreography:** 20.00–20.45s field-card grows into an upright panel; 20.45–21.15s “Your day” crops into the left zone; 21.15–21.80s active job panel snaps forward; 21.80–22.50s part chips join the job; 22.50–23.15s paired proof tiles flip in from opposite edges; 23.15–23.75s progress rule draws, then becomes a completed green check; 23.75–24.45s sample-record row unrolls below; 24.45–25.00s van silhouette rolls along the lower rule, carrying into inventory.

**Transition contract:** The moving van icon is the same object at the next shot's left edge. Silhouette crosses a shuttered split while the job card collapses into an inventory plane.

**Assets and technique:** CSS phone silhouette/interface, custom proof-tile artwork, no faux photographs; field interactions are depicted, not clickable.

**Sound intent:** Bed continues; cut at 25s.

### Shot 06 / 25.05–30.00s / 4.95s — “PARTS MOVE WITH THE PLAN.”
**Purpose:** Feature Transport: shared vans, stock status, low-stock/reorder awareness, parts reservation at approval.

**Composition and artistic idea:** Wide low-angle inventory table runs diagonally from bottom-left to upper-right, with one orange low-stock row physically lifting above the grid. Three van cards sit as depth layers: “Van 02 · Available”, “Van 04 · Allocated”, “Van 07 · Busy”. Inventory rows read “Capacitor · 2”, “Air filter · 6”, “Drain hose · 1 · Low stock”. A small strip says “Approval reserves parts in demo inventory.”

**Exact copy and holds:** 25.05 “TRANSPORT + STOCK”; 25.50 van labels; 26.30 “Shared transport”; 26.80 “Capacitor · 2”; 27.40 “Air filter · 6”; 28.00 “Drain hose · 1 · LOW STOCK”; 28.70 “Reserved at dispatch approval”; 29.30 “Reorder suggestions”; 29.60 “Synthetic inventory”. Key text remains through 29.70.

**Choreography:** 25.05–25.55s van carrier enters at bottom-left and settles; 25.55–26.25s three van cards arrive at staggered depth; 26.25–27.05s camera tilts over stock rows, each quantity ticks into place; 27.05–27.75s one capacitor chip detaches from stock and snaps to Van 04, demonstrating reservation without suggesting live stock; 27.75–28.40s low-stock row rises and gains orange edge; 28.40–29.25s reorder-suggestion tag types in; 29.25–29.70s the circular part chip grows into a service-log timeline node; 29.70–30.00s grid splits in a curved aperture.

**Transition contract:** Part-chip circle is the next scene's first timeline node; circular aperture opens into log. A dark inventory plane rotates away and fine line traces through the opening.

**Assets and technique:** Custom vector van symbols and inventory rows; no external imagery or actual system API data; demo labels explicit.

**Sound intent:** Bed continues; cut at 30s.

### Shot 07 / 30.00–35.50s / 5.50s — “A RECORD THAT FOLLOWS THE WORK.”
**Purpose:** Cover Service History and Reviews, distinguishing technician-scoped history and fictional review examples.

**Composition and artistic idea:** A fine copper line runs across the left half as a service timeline with completed-job entries; right half holds one oversized star and a compact review excerpt. On-screen labels state “Service History” and “Sample review”. Avoid fabricated customer identity. Review text: “Clear explanation and careful work.” and “Illustrative sample comment — not saved feedback.”

**Exact copy and holds:** 30.00 “SERVICE HISTORY”; 30.50 “Completed jobs”; 31.10 timeline entries “#4790 · Filter service” and “#4821 · Cooling fault”; 32.00 “CUSTOMER REVIEWS”; 32.45 “5.0 / 5 · sample review”; 33.05 “The expert explained the capacitor issue before replacing it.”; 33.80 “Fictional sample comments, not saved customer reviews.”; 34.35 “Boss sees the workshop. Technicians see their own work.” Hold through exit.

**Choreography:** 30.00–30.50s aperture opens to timeline node; 30.50–31.25s service line traces with two completed entries; 31.25–31.95s camera travels down to the newest entry and its work details; 31.95–32.55s star scales from a tiny point into a wide outline in the right zone; 32.55–33.25s rating numerals tick from 4.0 to 4.8 and settle; 33.25–34.05s review excerpt reveals through a narrow horizontal mask; 34.05–34.60s disclaimer resolves as small but legible text; 34.60–35.00s star's center becomes a chart point, and the line pulls the camera into the next field.

**Transition contract:** Star center expands as chart datum. Two elements: radial push through star plus service-line trajectory becomes a rising revenue line; dark/light panel pivot.

**Assets and technique:** SVG service timeline, outlined five-point star, sample text; source permits fictional demo sample reviews only. Do not claim genuine feedback.

**Sound intent:** Bed continues; cut at 35s.

### Shot 08 / 35.50–40.00s / 4.50s — “SEE THE WHOLE WORKSHOP.”
**Purpose:** Finish the breadth tour with workshop analytics and summarize the end-to-end dispatch flow.

**Composition and artistic idea:** Graphite field with the sales-area chart at left and accessory-usage bars at right; a thin vermilion route line threads between them, then collapses into a clean bone end card. Text labels: “Workshop analysis”, “Sample sales revenue · MYR”, “Accessory usage”, “Fictional demo figures.” Closing lockup: “Dispatch Hub” and “Conversation → diagnosis → dispatch → field work → insight”. Final small line: “Synthetic demo data · no live GPS”.

**Exact copy and holds:** 35.50 “WORKSHOP ANALYSIS”; 36.00 “Sample sales revenue · MYR”; 36.70 “Accessory usage”; 37.50 “Fictional demo figures”; 38.25 “Conversation → diagnosis → dispatch → field work → insight”; 39.05 “Dispatch Hub”; 39.45 “Synthetic demo data · no live GPS”. Closing lockup holds from 39.05 through 39.55 while its route-line underline continues to draw.

**Choreography:** 35.50–36.00s star point is chart's first datum; 36.00–36.80s revenue area draws across three distinct peaks, then a second axis rises; 36.80–37.50s usage bars build at varied heights and the yearly-average line settles; 37.50–38.10s sample label appears over data; 38.10–38.65s chart planes split into five workflow nodes, each connected by the route line; 38.65–39.15s nodes condense into a small vermilion hub mark made from an abstract radio-wave glyph and plain product name; 39.15–39.55s typography clears to the end-card, lockup remains readable; 39.55–40.00s underline curls into the opening's incoming vermilion tile, a match transition that keeps the frame occupied.

**Transition contract:** This finale ends unlike the feature shots: quiet bone field, centered plain-name lockup. At 40.00s the underline curls into the next loop's opening work-order tile via matched position, angular panel shutter, and a short scale reveal.

**Assets and technique:** CSS/SVG charts inspired by actual feature categories; values are illustrative, no accounting claim. The Dispatch Hub name is plain text, no fabricated logo.

**Sound intent:** Music resolves its phrase across the lockup; loop cut at 40s should return to the opening downbeat after onset verification.

## Audio spec
- Runtime: 40 s (scene cuts at 5.05, 10.40, 15.50, 20.00, 25.05, 30.00, 35.50, 40.00 s).
- Music: corporate motivational electronic instrumental, 120 BPM; tactile low kick, dry claps, restrained analog bass and bright marimba/synth plucks; confident, operational, human. Measured RMS onsets include 5.05, 10.40, 15.50, 20.00, 25.05, 30.00, 35.50, 39.50 seconds. Cuts aligned to the closest measured onsets; resolved loop-friendly ending. No vocals.
- Voiceover: not requested.
- SFX: not requested.
- Playback file: `public/audio/bg_music.mp3`.

## Variety / accuracy review
Eight timed compositions alternate role split, open overview, transcript/analysis close-up, map-first dispatch, field-panel portrait, diagonal inventory plane, editorial timeline/review split and chart-to-lockup finale. Each boundary carries a physical element and combines at least two transition mechanics. The film presents Boss and Technician as synthetic demo roles; role selection is explicitly not account security. Map is schematic and never described as live GPS. Analysis is labeled as a suggestion and the example remains rule-based; review copy and analytics are clearly fictional. No values are described as live or saved real-world records.
