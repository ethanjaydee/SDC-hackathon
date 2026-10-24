---
name: Legacy dispatch completion
description: Conservative interpretation of assignments saved before completion tracking existed.
---
Only adopt an older saved dispatch as active when the technician is Busy and has exactly one structured saved dispatch. Leave ambiguous historical assignments Unknown and block their completion; never invent a job for a seeded Busy technician.

**Why:** Older records did not track completion, so several approvals or a Busy flag alone cannot establish which job currently owns the technician. Automatically completing guessed assignments could release someone working on another job.

**How to apply:** Preserve these restrictions when changing lifecycle migrations or adding legacy reconciliation. Reconciliation needs an explicit user decision rather than silently choosing a historical record.

An explicit dispatcher availability reset may make an unassigned Busy demo technician available, but it is not evidence that an older job was completed. This availability-only reset must protect tracked active jobs.

**Why:** The user wants to reuse the synthetic demo technicians and explicitly chose to protect active jobs. Permission to reset availability does not authorize inferring or rewriting historical work.

**How to apply:** Preserve the distinction between an explicit demo status reset and a verified job completion when changing lifecycle behavior or migrating older assignments.

A full work-order reset restarts demo work orders as undispatched, cancelling their active demo assignments and returning reserved parts. It also clears existing Telegram conversations from the Boss inbox by archiving them. Preserve completed service history, audit logs, Telegram transcripts and Telegram assignments; active Telegram jobs must remain available to their technicians. Never return stock consumed by completed jobs or treat a cancellation as completion.

**Why:** The user chose a full demo restart, then explicitly asked Reset to clear Telegram messages too. Clearing the inbox does not authorize deleting Telegram chats, audit history or live Telegram assignments.

**How to apply:** Keep full work-order restart separate from availability-only reset. Incoming messages after a reset start fresh conversations, but retain processed Telegram update IDs so retries cannot restore old messages. Unknown legacy assignments are not evidence for restoring stock or releasing a technician.
