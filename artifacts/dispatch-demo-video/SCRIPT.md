# Dispatch Hub — Technician Work Order Flow

## Director's treatment
- **Promise:** Stay inside the Technician view and follow one Work Order from the inbox trigger through its AI job brief, Google Maps directions, an intentional accept gesture, job completion, and the green Completed state.
- **Identity:** Use the live site's own warm-neutral interface, red-orange action color, green success state, typography, icons, and spacing. No invented UI reskin.
- **Hero:** The real Dispatch Hub screens captured from the running main website; the shared hero is Work Order #2, “Oil filter housing is seeping.”
- **Motion:** Fast screen cuts, direct cursor/click choreography, and brief target outlines that land only on the control or data being discussed.
- **Arc:** Enter Technician mode, open a request, inspect its connected brief and map link, make the accept decision, then close the job.
- **Payoff:** The same request's status changes from an idle “Sample details” state to a green “Completed” badge; a final route rule sweeps into the role-choice frame for the loop.
- **Format:** 16:9 landscape, 20.00 seconds.

## Capture and fidelity notes
- Every full-frame screen is a direct PNG screenshot of the website preview at `/`, captured at 1600 × 900 while following Technician role selection → Ravi Kumar identity → Technician overview → Work Order inbox → Work Order #2.
- Local screen assets: `public/website-screens/01-role-chooser.png` through `05-work-order-brief.png`. No generated imagery, GIFs, or external stock assets.
- The site's own role picker is the only opening frame that contains a Boss option; it is visible only because it is part of the real Technician entry point. No Boss dashboard or manager workflow is shown.
- Scenes 6–8 reuse the captured Work Order screen. The accept/completed states are motion-graphic overlays aligned to the existing controls, labels, and site color treatments. No live dispatch/complete action was written to the main website.
- Screens are explicitly synthetic demo data. The Maps action shown is the website's own “Open customer directions in Google Maps” link for a sample customer site; no Google map tiles or live route are fabricated.
- The sample job shown currently reports an AI analysis. Its issue wording explicitly says the cause is unverified; preserve that qualifier.

## Timeline

| Scene | Time | Focus | Action / handoff |
| --- | --- | --- | --- |
| 01 | 00.00–02.00 | Role chooser | Pointer selects Technician; cut into identity picker |
| 02 | 02.00–03.60 | Technician identity | Select Ravi Kumar, Level 3 · Expert |
| 03 | 03.60–05.40 | Technician overview | Point to Work Order navigation |
| 04 | 05.40–07.80 | Work Order inbox | Open request #2 |
| 05 | 07.80–12.20 | Conversation, AI brief, customer visit | Pick up the analysis and Google Maps link |
| 06 | 12.20–14.80 | Acceptance decision | Pause, then slide to accept; acceptance resolves in green/blue |
| 07 | 14.80–16.90 | Accepted work | “Complete job” button becomes the focal control |
| 08 | 16.90–20.00 | Completed outcome | Status turns green; closing line carries the loop to the role choice |

## Shot-by-shot script

### 01 · Technician role / 00.00–02.00 / 2.00s
- **Purpose:** Start inside the real website and establish that this walkthrough is Technician-only.
- **Exact screen copy:** Website screenshot `01-role-chooser.png`: “Dispatch Hub”, “Choose a demo role”, “Boss”, “Technician”, and “Demo role selection, not real security.”
- **Composition:** Full-frame 16:9 screen capture. No fabricated header, framing, or supporting graphics.
- **Choreography:** A small pointer enters from the left, settles on the Technician role card, then taps once. A thin orange focus outline flashes around only that card.
- **Transition:** The focus rectangle contracts toward the selected role's center and the next capture resolves from that point.
- **Sound:** Existing instrumental score; no voiceover or sound effects.

### 02 · Choose a technician / 02.00–03.60 / 1.60s
- **Purpose:** Show the actual synthetic identity selector, not a login or a new role system.
- **Exact screen copy:** Screenshot `02-technician-identity.png`; focus on “Ravi Kumar” and “Level 3 · Expert”. The persistent website notice says the demo choice is not real security.
- **Composition:** The actual centered two-column roster remains full-frame and legible.
- **Choreography:** Outline the Ravi identity row; the pointer arrives and clicks. Hold briefly on the selected profile before leaving.
- **Transition:** Match the cursor's downward movement to the Work Order navigation in the technician overview.
- **Sound:** Score continues; short downbeat cut.

### 03 · Technician home / 03.60–05.40 / 1.80s
- **Purpose:** Confirm the product is now in the Technician interface.
- **Exact screen copy:** Screenshot `03-technician-overview.png`: “Hello, Ravi”, “Your active jobs, sample record and the vans available to take out”, “Available”, and the Work Order navigation item.
- **Composition:** Use the real dashboard capture, with the technician sidebar, overview and shared transport visible.
- **Choreography:** One tap ring lands on “Work Order”; the camera pushes slightly toward the sidebar without cropping the Technician identity from the page.
- **Transition:** The selected navigation item is the left-edge anchor of the inbox screenshot.
- **Sound:** Score continues.

### 04 · Work Order trigger / 05.40–07.80 / 2.40s
- **Purpose:** Trace the request from the Technician's Work Order inbox into its detail.
- **Exact screen copy:** Screenshot `04-work-orders.png`, focusing the card “DEMO · CHAT #2”, “Oil filter housing is seeping”, “Central Demo Customer · Demo customer · Puchong”, “Needs review”, and “Open work order”.
- **Composition:** Keep the complete real inbox visible; orange outline encloses only the matching request.
- **Choreography:** Outline the card first, then the pointer travels to “Open work order” and clicks. The card edge expands into the detail view.
- **Transition:** Match the work-order subject line through the cut.
- **Sound:** Score continues.

### 05 · AI brief + Google Maps / 07.80–12.20 / 4.40s
- **Purpose:** Show the connected job context available to this technician before acceptance.
- **Exact screen copy:** Screenshot `05-work-order-brief.png`, “WORK ORDER · #2”, “Oil filter housing is seeping”; conversation: “I can see a small seep near the filter seal. I will verify the housing and filter fit before replacing anything.” / “Understood. Please check the filter stock before scheduling a visit.” Job brief: “AI diagnosis & job brief”, “Med urgency”, “Oil seep near Wix 57356 filter seal; unverified cause (housing/seal fit)”, “Wix 57356 Filter”, and “You are eligible: qualified, available, and an available van has the parts.” Customer visit: sample Puchong address and the website's “Open customer directions in Google Maps” link.
- **Composition:** Actual two-column Work Order page stays visible. The orange focus outline first isolates the AI brief and Wix filter; it then jumps to the actual Google Maps directions link below.
- **Choreography:** 7.80–8.40 the customer chat panel resolves; 8.40–9.50 the AI brief outline lands; 9.50–10.25 the issue and part row get a subtle callout; 10.25–11.15 the customer visit panel is isolated; 11.15–12.00 the Google Maps link receives the pointer and one tap ring; 12.00–12.20 the camera settles on the accept control in the same page.
- **Transition:** Keep the right-hand visit card fixed as the cursor lowers to its slider.
- **Sound:** Existing bed, uninterrupted.

### 06 · Decide, then slide / 12.20–14.80 / 2.60s
- **Purpose:** Make the Technician's choice explicit: the request is optional until the slider is moved.
- **Exact screen copy:** The actual `Slide to accept this work order` control and helper text, “Drag right, or focus the handle, press End, then Enter. Clicking the track does nothing.”
- **Composition:** Use the same captured Work Order page. Outline the live-looking slider; leave the eligible job brief visible above it.
- **Choreography:** Hold on the idle handle for 0.4s so the decision reads. The pointer grabs the handle and moves it left-to-right along the control, then releases. A checkmark and “Work order accepted” briefly resolve.
- **Transition:** The accepted control's green/blue state holds its position into the next screen state.
- **Sound:** Existing bed; action timed to its pulse.

### 07 · Finish the job / 14.80–16.90 / 2.10s
- **Purpose:** Show the next Technician action after accepting and completing field work.
- **Exact screen copy:** Reuse the Work Order detail screenshot. Replace the stale “Slide to accept” eligibility message with “Assigned to Ravi Kumar · active work order.” Replace only the acceptance-control area with the website-matched “Complete job” visual button; switch the “Sample details” chip to “Accepted”.
- **Composition:** The real job conversation, AI diagnosis and required-parts data, and sample customer visit remain on screen; a restrained green edge indicates the accepted work-order state.
- **Choreography:** Accepted status lands; the pointer moves to “Complete job” and taps it. A compact confirmation check flashes once.
- **Transition:** The check color expands into the Completed status chip at the same position.
- **Sound:** Existing bed continues; no added click SFX.

### 08 · Completed / 16.90–20.00 / 3.10s
- **Purpose:** Make the visible end state unmistakable and tie it to the same request.
- **Exact screen copy:** Keep “WORK ORDER · #2” and “Oil filter housing is seeping” visible. Replace the stale eligibility message with “Work completed by Ravi Kumar.” Replace the customer-visit sample chip with the site's native green “Completed” status treatment and the completion control with “Completed”.
- **Composition:** The same actual detail screen fills the frame; a soft green border surrounds its conversation card and a green completion chip replaces the action. No other role or feature appears.
- **Choreography:** 16.90–17.25 the completed badge resolves; 17.25–18.00 the conversation card's green dispatch-state border comes in; 18.00–19.35 the Completed status holds readable; 19.35–20.00 a thin orange rule sweeps along the lower edge and carries into the first role-choice frame on loop.
- **Transition:** Hard loop at 20.00s; the incoming Technician card is the first orange-accent focus.
- **Sound:** Existing 40s generated instrumental is retained. The video/audio controller resets the music to 0s at the 20.00s loop, landing on the existing measured onset.

## Audio and assets
- Runtime: **20.00s**, eight scenes. Cut points: 2.00, 3.60, 5.40, 7.80, 12.20, 14.80, 16.90, 20.00s.
- Music: Preserve `public/audio/bg_music.mp3`; it remains the only audio. No new score, VO, or SFX.
- Visual assets: Five direct website PNG captures in `public/website-screens/`; no generated images, illustrations, stock, or GIFs.
- The acceptance and completion microstates are visual choreography over the captured screen. The production walkthrough does not mutate the running main website.

## Accuracy and variety check
Every screen belongs to the Technician path. There is one Work Order throughout: #2, “Oil filter housing is seeping”. The captured AI diagnosis keeps the unverified-cause wording; Google Maps is shown only as the real site directions link for a labeled sample customer site. The post-action chips use the website's existing accepted/completed status language and green success styling, but no live write was performed. Shots alternate full UI, identity selection, sidebar action, focused inbox card, job-detail data review, slider interaction, accepted button, and completion payoff.
