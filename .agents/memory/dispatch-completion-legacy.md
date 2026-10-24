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

A full demo work-order reset is a separate, explicitly authorized operation: restart all demo work orders as undispatched, cancelling their active demo assignments and returning reserved parts. Preserve completed service history, audit logs, Telegram conversations and Telegram assignments. Never return stock consumed by completed jobs or treat a cancellation as completion.

**Why:** The user chose to restart demo work orders, rather than only restore hidden cards, while retaining history and external conversations.

**How to apply:** Keep full work-order restart separate from availability-only reset. Unknown legacy assignments are not evidence for restoring stock or releasing a technician.
