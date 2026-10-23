import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ANALYTICS_YEARS, getInventoryRestockSuggestion, getPartsMonthlyUsage, getSalesMonthly, getSalesYearly, getStockPlan } from '../src/components/dispatch/workshopAnalytics';

test('sample sales revenue is the exact sum of twelve monthly MYR values', () => {
  for (const year of ANALYTICS_YEARS) {
    const monthly = getSalesMonthly(year);
    assert.equal(monthly.length, 12);
    assert.equal(getSalesYearly().find((row) => row.year === year)!.salesMyr, monthly.reduce((s, row) => s + row.salesMyr, 0));
    assert.ok(monthly.every((row) => row.salesMyr > 0));
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
  assert.throws(() => getSalesMonthly(2030), RangeError);
  assert.throws(() => getStockPlan('AC Capacitor 35uF', 2026, 13), RangeError);
});
test('inventory restock suggestions share one fleet purchase and separate van top-ups', () => {
  const inventory = [1, 2, 3].map((van_id) => ({ van_id, part_name: 'AC Capacitor 35uF', quantity: 3 }));
  for (const van of [1, 2, 3]) {
    const suggestion = getInventoryRestockSuggestion('ac capacitor 35uf', 2026, 1, van, inventory);
    assert.equal(suggestion.suggestedBuy, 11);
    assert.equal(suggestion.vanTopUp, 2);
    assert.equal(suggestion.targetStock, 20);
  }
  inventory[1].quantity = 30;
  assert.equal(getInventoryRestockSuggestion('AC Capacitor 35uF', 2026, 1, 1, inventory).suggestedBuy, 0);
  const unknown = getInventoryRestockSuggestion('Legacy part', 2026, 1, 1, [{ van_id: 1, part_name: 'Legacy part', quantity: 2 }]);
  assert.equal(unknown.hasUsageData, false);
  assert.equal(unknown.monthlyUsage, null);
  assert.equal(unknown.suggestedBuy, 3);
  assert.equal(getInventoryRestockSuggestion('AC Filter', 2026, 1, 1).suggestedBuy, null);
  assert.throws(() => getInventoryRestockSuggestion('Legacy part', 2026, 13, 1, []), RangeError);
});
