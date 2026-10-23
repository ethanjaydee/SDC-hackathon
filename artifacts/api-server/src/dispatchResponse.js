export class TechnicianResponseError extends Error {
  constructor(message, statusCode = 409) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function createTechnicianResponseRecorder(db, now = () => new Date().toISOString()) {
  return db.transaction(({ dispatch_id, technician_id, response }) => {
    const job = db.prepare("SELECT * FROM dispatches WHERE activity_id = ?").get(dispatch_id);
    if (!job) throw new TechnicianResponseError("No tracked dispatch was found for this response.", 404);
    if (job.tech_id !== technician_id) {
      throw new TechnicianResponseError("Only the technician assigned to this dispatch can respond.");
    }
    if (job.status !== "Active") {
      throw new TechnicianResponseError("This dispatch is no longer active and cannot receive a response.");
    }
    if (job.technician_response) {
      if (job.technician_response !== response) {
        throw new TechnicianResponseError("A different technician response is already recorded.");
      }
      return {
        dispatch_id,
        technician_id,
        response: job.technician_response,
        responded_at: job.technician_response_at,
      };
    }

    const responded_at = now();
    const update = db.prepare(`
      UPDATE dispatches
      SET technician_response = ?, technician_response_at = ?
      WHERE activity_id = ? AND tech_id = ? AND status = 'Active' AND technician_response IS NULL
    `).run(response, responded_at, dispatch_id, technician_id);
    if (update.changes !== 1) {
      throw new TechnicianResponseError("The dispatch changed before the response was saved. Refresh and try again.");
    }
    db.prepare(
      "INSERT INTO activity_log (timestamp, action_details, approved_by) VALUES (?, ?, ?)",
    ).run(
      responded_at,
      `Technician response: ${response.toLowerCase()} · Dispatch #${dispatch_id}. The job, van and reserved parts remain allocated.`,
      job.technician_name,
    );
    return { dispatch_id, technician_id, response, responded_at };
  });
}
