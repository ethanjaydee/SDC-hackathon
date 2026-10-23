import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { HubData } from '@workspace/api-client-react';
import { DEMO_CUSTOMER_SITES, distanceKm, getTechnicianLocation } from '../src/components/dispatch/demoLocations';
import { rankQualifiedTechnicians } from '../src/components/dispatch/matching';
import { getBusyVanMapLocations } from '../src/components/dispatch/busyVanMapLocations';

function hubData(): HubData {
  return {
    technicians: [1, 2, 3, 99].map((id) => ({
      id, name: `Tech ${id}`, status: 'Available', zone: 'Sample zone', van_id: id, level: 3,
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
test('Boss map pairs busy vans only with saved active sites and known sample technician positions', () => {
  const locations = getBusyVanMapLocations(
    [
      { id: 1, name: 'Workshop Van 1', plate: 'DEMO-V01', status: 'Busy', technician_id: 1, technician_name: 'Tech 1', dispatch_id: 11 },
      { id: 2, name: 'Workshop Van 2', plate: 'DEMO-V02', status: 'Busy', technician_id: null, technician_name: null, dispatch_id: 99 },
      { id: 3, name: 'Workshop Van 3', plate: 'DEMO-V03', status: 'Available', technician_id: null, technician_name: null, dispatch_id: null },
    ],
    [{
      id: 11,
      timestamp: '2026-10-23T10:00:00.000Z',
      completion_dispatch_id: null,
      action_details: 'Dispatch approved',
      approved_by: 'Boss',
      dispatch: {
        status: 'Active', completed_at: null, tech_id: 1, technician_name: 'Tech 1', van_id: 1,
        parts: [], customer_site: DEMO_CUSTOMER_SITES[0], conversation_id: 1,
      },
    }],
    [{ id: 1, name: 'Tech 1', status: 'Busy', zone: 'Petaling Jaya', van_id: 1, lat: 3.109, lng: 101.633 }],
  );

  assert.equal(locations.length, 2, 'available vans are not mapped as busy');
  assert.deepEqual(locations[0].vanLocation, { lat: 3.109, lng: 101.633 });
  assert.equal(locations[0].customerSite?.id, 'north');
  assert.equal(locations[1].vanLocation, null);
  assert.equal(locations[1].customerSite, null, 'missing active assignment locations remain unknown');
});
test('only available technicians with all required parts qualify', () => {
  const hub = hubData();
  hub.technicians[0].status = 'Busy';
  hub.inventory.find((item) => item.van_id === 2 && item.part_name === 'NPN Transistor')!.quantity = 0;
  assert.deepEqual(rankQualifiedTechnicians(hub, parts, customer).map((tech) => tech.id), [3, 99]);
});
test('qualification order does not pretend straight-line proximity is Google driving distance', () => {
  const hub = hubData();
  hub.technicians[1].rating = 4.9;
  const matches = rankQualifiedTechnicians(hub, parts, customer);
  assert.equal(matches[0]?.id, 2);
  assert.deepEqual(matches.slice(1).map((tech) => tech.id), [1, 3, 99]);
});
test('easy favors interns, hard excludes juniors, and an active shared van blocks allocation', () => {
  const hub = hubData();
  hub.technicians[0].level = 1;
  hub.technicians[1].level = 2;
  hub.technicians[2].level = 3;
  assert.deepEqual(rankQualifiedTechnicians(hub, parts, customer, 'Hard').map((t) => t.id), [3, 99]);
  assert.equal(rankQualifiedTechnicians(hub, parts, customer, 'Easy')[0]?.id, 1);
  hub.activity_log.push({ id: 1, timestamp: '', action_details: '', approved_by: '', completion_dispatch_id: null,
    dispatch: { tech_id: 77, technician_name: '', van_id: 3, parts, customer_site: DEMO_CUSTOMER_SITES[0], status: 'Active', completed_at: null, conversation_id: null } });
  assert.equal(rankQualifiedTechnicians(hub, parts, customer, 'Hard').some((t) => t.id === 3), false);
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
