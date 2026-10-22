type RequestLink = { dispatch_activity_id: number | null };
type DispatchRecord = {
  id: number;
  completion_dispatch_id: number | null;
  dispatch: { status: 'Active' | 'Completed' | 'Unknown' } | null;
};

/** Missing or legacy completion records remain unknown, never assumed undone. */
export function getUnfinishedRequests(requests: readonly RequestLink[], activity: readonly DispatchRecord[]) {
  const approvals = new Map(activity.map((entry) => [entry.id, entry]));
  const completed = new Set(activity.flatMap((entry) => entry.completion_dispatch_id == null ? [] : [entry.completion_dispatch_id]));
  let awaitingDispatch = 0;
  let inProgress = 0;
  let unknown = 0;
  for (const request of requests) {
    if (request.dispatch_activity_id == null) {
      awaitingDispatch += 1;
      continue;
    }
    const status = approvals.get(request.dispatch_activity_id)?.dispatch?.status;
    if (completed.has(request.dispatch_activity_id) || status === 'Completed') continue;
    if (status === 'Active') inProgress += 1;
    else unknown += 1;
  }
  return { unfinished: awaitingDispatch + inProgress, awaitingDispatch, inProgress, unknown };
}
