---
name: Legacy dispatch completion
description: Conservative interpretation of assignments saved before completion tracking existed.
---
Only adopt an older saved dispatch as active when the technician is Busy and has exactly one structured saved dispatch. Leave ambiguous historical assignments Unknown and block their completion; never invent a job for a seeded Busy technician.

**Why:** Older records did not track completion, so several approvals or a Busy flag alone cannot establish which job currently owns the technician. Automatically completing guessed assignments could release someone working on another job.

**How to apply:** Preserve these restrictions when changing lifecycle migrations or adding legacy reconciliation. Reconciliation needs an explicit user decision rather than silently choosing a historical record.

An explicit dispatcher reset may make an unassigned Busy demo technician available, but it is not evidence that an older job was completed. Technicians with tracked active jobs must still use normal completion.

**Why:** The user wants to reuse the synthetic demo technicians and explicitly chose to protect active jobs. Permission to reset availability does not authorize inferring or rewriting historical work.

**How to apply:** Preserve the distinction between an explicit demo status reset and a verified job completion when changing lifecycle behavior or migrating older assignments.
