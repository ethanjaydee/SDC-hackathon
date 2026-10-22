import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANALYTICS_YEARS, getPartsMonthlyUsage, getSalaryMonthly, getSalaryYearly, getStockPlan } from '../src/components/dispatch/workshopAnalytics';

test('sample yearly payroll is the exact sum of twelve monthly MYR costs', () => {
  for (const year of ANALYTICS_YEARS) {
    const monthly = getSalaryMonthly(year);
    assert.equal(monthly.length, 12);
    assert.equal(getSalaryYearly().find((row) => row.year === year)!.salaryMyr, monthly.reduce((s, row) => s + row.salaryMyr, 0));
    assert.ok(monthly.every((row) => row.salaryMyr > 0));
  }
});
test('January capacitor example uses 15, targets 20, and purchases only the shortage', () => {
  const inventory = [1, 2, 3].map((van_id) => ({ van_id, part_name: 'AC Capacitor 35uF', quantity: 3 }));
  const snapshot = JSON.stringify(inventory);
  const plan = getStockPlan('AC Capacitor 35uF', 2026, 1, inventory);
  assert.equal(plan.monthlyUsage, 15);
  assert.equal(plan.averageMonthlyUsage, 15);
  assert.equal(plan.targetStock, 20);
  assert.equal(plan.stockOnHand, 9);
  assert.equal(plan.suggestedPurchase, 11);
  assert.equal(plan.belowThreshold, false);
  assert.ok(plan.vanAlerts.every((van) => van.belowThreshold));
  assert.equal(JSON.stringify(inventory), snapshot);
});
test('low-stock alert is strictly below five; unknown inventory is never reported as zero', () => {
  const line = (quantity: number) => [{ van_id: 1, part_name: 'AC Capacitor 35uF', quantity }];
  assert.equal(getStockPlan('AC Capacitor 35uF', 2026, 1, line(4)).belowThreshold, true);
  assert.equal(getStockPlan('AC Capacitor 35uF', 2026, 1, line(5)).belowThreshold, false);
  assert.equal(getStockPlan('AC Capacitor 35uF', 2026, 1, line(30)).suggestedPurchase, 0);
  assert.equal(getStockPlan('AC Capacitor 35uF', 2026, 1).stockOnHand, null);
  assert.equal(getStockPlan('AC Capacitor 35uF', 2026, 1).suggestedPurchase, null);
  assert.equal(getPartsMonthlyUsage(2026, 'AC Capacitor 35uF').length, 12);
  assert.throws(() => getSalaryMonthly(2030), RangeError);
  assert.throws(() => getStockPlan('AC Capacitor 35uF', 2026, 13), RangeError);
});
