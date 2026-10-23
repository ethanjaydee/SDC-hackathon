import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HubData } from '@workspace/api-client-react';
import { rankQualifiedTechnicians } from '../src/components/dispatch/matching';
import { optimisticAvailable, optimisticDispatch } from '../src/lib/hub-write';
import { DEMO_CUSTOMER_SITES } from '../src/components/dispatch/demoLocations';

function fixture(): HubData {
  return {
    technicians: [
      { id: 1, name: 'Demo intern', status: 'Available', zone: 'Puchong', van_id: 99, level: 1 },
      { id: 2, name: 'Demo expert', status: 'Available', zone: 'Cheras', van_id: 88, level: 3 },
      { id: 3, name: 'Demo busy', status: 'Busy', zone: 'PJ', van_id: 77, level: 3 },
    ],
    vans: [1, 2].map((id) => ({ id, name: `Van ${id}`, plate: `DEMO${id}`, status: 'Available', technician_id: null, technician_name: null, dispatch_id: null })),
    inventory: [{ id: 1, van_id: 2, part_name: 'LED Bulb E27', quantity: 2 }],
    activity_log: [],
  };
}

test('shared stocked transport replaces fixed technician vans while junior-first still applies', () => {
  const hub = fixture();
  const matches = rankQualifiedTechnicians(hub, ['LED Bulb E27'], DEMO_CUSTOMER_SITES[0], 'Easy');
  assert.deepEqual(matches.map((tech) => [tech.id, tech.van_id]), [[1, 2], [2, 2]]);
  assert.equal(hub.technicians[0].van_id, 99, 'provisional allocation never rewrites legacy identity');
  hub.vans![1].status = 'Busy';
  assert.deepEqual(rankQualifiedTechnicians(hub, ['LED Bulb E27'], DEMO_CUSTOMER_SITES[0], 'Easy'), []);
  hub.vans = [];
  hub.technicians[0].van_id = 2;
  assert.deepEqual(rankQualifiedTechnicians(hub, ['LED Bulb E27'], DEMO_CUSTOMER_SITES[0], 'Easy'), []);
  hub.vans = fixture().vans;
  assert.deepEqual(rankQualifiedTechnicians(hub, ['LED Bulb E27', 'LED Bulb E27', 'LED Bulb E27'], DEMO_CUSTOMER_SITES[0], 'Easy'), []);
});

test('optimistic allocation and release track the shared van without inventing audit entries or returning stock', () => {
  const before = fixture();
  const allocated = optimisticDispatch(before, 1, 2, ['LED Bulb E27']);
  assert.equal(allocated.technicians[0].status, 'Busy');
  assert.equal(allocated.vans![1].technician_id, 1);
  assert.equal(allocated.vans![1].status, 'Busy');
  assert.equal(allocated.inventory[0].quantity, 1);
  assert.deepEqual(allocated.activity_log, before.activity_log);
  const completed = optimisticAvailable(allocated, 1);
  assert.equal(completed.vans![1].status, 'Available');
  assert.equal(completed.vans![1].technician_id, null);
  assert.deepEqual(completed.inventory, allocated.inventory);
});
