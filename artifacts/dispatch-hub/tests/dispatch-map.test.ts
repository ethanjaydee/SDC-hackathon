import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HubData } from '@workspace/api-client-react';
import { DEMO_CUSTOMER_SITES, distanceKm, getTechnicianLocation } from '../src/components/dispatch/demoLocations';
import { rankQualifiedTechnicians } from '../src/components/dispatch/matching';

function hubData(): HubData {
  return {
    technicians: [1, 2, 3, 99].map((id) => ({
      id, name: `Tech ${id}`, status: 'Available', zone: 'Sample zone', van_id: id,
    })),
    inventory: [1, 2, 3, 99].flatMap((van_id) => [
      { id: van_id * 10, van_id, part_name: '100uF Capacitor', quantity: 3 },
      { id: van_id * 10 + 1, van_id, part_name: 'NPN Transistor', quantity: 2 },
    ]),
    activity_log: [],
  };
}
const parts = ['100uF Capacitor', 'NPN Transistor'];
const customer = DEMO_CUSTOMER_SITES[1];

test('distance is zero for identical coordinates and symmetric for different sites', () => {
  assert.equal(distanceKm(customer, customer), 0);
  const other = DEMO_CUSTOMER_SITES[0];
  assert.ok(distanceKm(customer, other) > 0);
  assert.equal(distanceKm(customer, other), distanceKm(other, customer));
  const km = distanceKm({ lat: 0, lng: 0, label: '' }, { lat: .01, lng: 0, label: '' });
  assert.ok(Math.abs(km - 1.11195) < .001);
});
test('every sample site has valid coordinates; unknown technicians do not get fabricated locations', () => {
  assert.equal(getTechnicianLocation(99), undefined);
  for (const site of DEMO_CUSTOMER_SITES) {
    assert.ok(Number.isFinite(site.lat) && Math.abs(site.lat) <= 90);
    assert.ok(Number.isFinite(site.lng) && Math.abs(site.lng) <= 180);
  }
});
test('only available technicians with all required parts qualify', () => {
  const hub = hubData();
  hub.technicians[0].status = 'Busy';
  hub.inventory.find((item) => item.van_id === 2 && item.part_name === 'NPN Transistor')!.quantity = 0;
  assert.deepEqual(rankQualifiedTechnicians(hub, parts, customer).map((tech) => tech.id), [3, 99]);
});
test('nearest qualified technicians rank first, and unknown locations rank last', () => {
  const hub = hubData();
  const matches = rankQualifiedTechnicians(hub, parts, customer);
  const ordered = matches.slice(0, -1).map((tech) => distanceKm(getTechnicianLocation(tech.id)!, customer));
  assert.deepEqual(ordered, [...ordered].sort((a, b) => a - b));
  assert.equal(matches.at(-1)?.id, 99);
});
test('repeated required parts need enough stock and match case-insensitively', () => {
  const hub = hubData();
  hub.inventory.find((item) => item.van_id === 1 && item.part_name === 'NPN Transistor')!.quantity = 1;
  const ids = rankQualifiedTechnicians(hub, ['NPN Transistor', 'npn transistor'], customer).map((tech) => tech.id);
  assert.equal(ids.includes(1), false);
  assert.equal(ids.includes(2), true);
});
test('absent hub data and absent analysis do not produce qualified matches', () => {
  assert.deepEqual(rankQualifiedTechnicians(undefined, parts, customer), []);
  assert.deepEqual(rankQualifiedTechnicians(hubData(), [], customer), []);
});
test('a completed technician qualifies again only when remaining stock meets demand', () => {
  const hub = hubData();
  hub.technicians[0].status = 'Busy';
  assert.equal(rankQualifiedTechnicians(hub, parts, customer).some((t) => t.id === 1), false);
  hub.technicians[0].status = 'Available';
  assert.equal(rankQualifiedTechnicians(hub, parts, customer).some((t) => t.id === 1), true);
  hub.inventory.find((item) => item.van_id === 1 && item.part_name === 'NPN Transistor')!.quantity = 0;
  assert.equal(rankQualifiedTechnicians(hub, parts, customer).some((t) => t.id === 1), false);
});
