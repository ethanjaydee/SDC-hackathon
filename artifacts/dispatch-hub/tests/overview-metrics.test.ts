import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getUnfinishedRequests } from '../src/components/dispatch/overviewMetrics';
import { getSalesYtd, getSalesMonthly } from '../src/components/dispatch/workshopAnalytics';

test('unfinished requests include pending and active jobs, not completed or unknown history', () => {
  const requests = [null, 1, 2, 3, 4, 99].map((dispatch_activity_id) => ({ dispatch_activity_id }));
  const activity = [
    { id: 1, completion_dispatch_id: null, dispatch: { status: 'Active' as const } },
    { id: 2, completion_dispatch_id: null, dispatch: { status: 'Completed' as const } },
    { id: 3, completion_dispatch_id: null, dispatch: { status: 'Unknown' as const } },
    { id: 4, completion_dispatch_id: null, dispatch: { status: 'Active' as const } },
    { id: 5, completion_dispatch_id: 4, dispatch: null },
  ];
  assert.deepEqual(getUnfinishedRequests(requests, activity), { unfinished: 2, awaitingDispatch: 1, inProgress: 1, unknown: 2 });
  assert.deepEqual(getUnfinishedRequests([], []), { unfinished: 0, awaitingDispatch: 0, inProgress: 0, unknown: 0 });
});

test('sales YTD sums only January through the displayed month', () => {
  assert.equal(getSalesYtd(2026, 1), 91000);
  assert.equal(getSalesYtd(2026, 10), getSalesMonthly(2026).slice(0, 10).reduce((sum, row) => sum + row.salesMyr, 0));
  assert.equal(getSalesYtd(2026, 12), getSalesMonthly(2026).reduce((sum, row) => sum + row.salesMyr, 0));
  assert.throws(() => getSalesYtd(2026, 0), RangeError);
  assert.throws(() => getSalesYtd(2026, 13), RangeError);
  assert.throws(() => getSalesYtd(2030, 1), RangeError);
});
