/** Fictional full-year workshop planning examples, never payroll or usage records. */
export const ANALYTICS_YEARS = [2024, 2025, 2026] as const;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const SAFETY_STOCK = 5;
export const LOW_STOCK_THRESHOLD = 5;
export const USAGE_PARTS = ['AC Capacitor 35uF', 'LED Bulb E27', 'AC Filter', 'Drain Hose', 'AC Control Board', 'AAA Battery'] as const;
export type UsagePart = typeof USAGE_PARTS[number];
export type StockLine = { van_id: number; part_name: string; quantity: number };

const salary: Record<number, readonly number[]> = {
  2024: [24500, 24500, 25000, 25000, 25800, 25800, 26500, 26500, 27000, 27000, 27800, 29000],
  2025: [28500, 28500, 29200, 29200, 30000, 30000, 31000, 31000, 31800, 31800, 32500, 34000],
  2026: [33000, 33000, 33800, 33800, 34600, 34600, 35500, 35500, 36400, 36400, 37200, 39000],
};
const usage: Record<UsagePart, readonly number[]> = {
  'AC Capacitor 35uF': [15, 14, 16, 15, 17, 14, 16, 15, 15, 14, 16, 13],
  'LED Bulb E27': [28, 25, 30, 27, 31, 29, 32, 30, 28, 27, 29, 26],
  'AC Filter': [22, 20, 24, 23, 26, 24, 25, 23, 22, 21, 24, 22],
  'Drain Hose': [9, 8, 10, 9, 11, 10, 10, 9, 8, 9, 10, 8],
  'AC Control Board': [4, 3, 5, 4, 5, 4, 5, 4, 3, 4, 5, 3],
  'AAA Battery': [18, 16, 20, 18, 21, 19, 20, 18, 17, 18, 19, 16],
};

function checkYear(year: number) {
  if (!ANALYTICS_YEARS.some((y) => y === year)) throw new RangeError('Choose a supported sample year.');
}
export function getSalaryMonthly(year: number) {
  checkYear(year);
  return salary[year].map((salaryMyr, index) => ({ year, month: index + 1, monthLabel: MONTHS[index], salaryMyr }));
}
export function getSalaryYearly() {
  return ANALYTICS_YEARS.map((year) => ({ year, salaryMyr: salary[year].reduce((sum, value) => sum + value, 0) }));
}
export function getPartsMonthlyUsage(year: number, partName: UsagePart) {
  checkYear(year);
  if (!usage[partName]) throw new RangeError('Choose a supported sample part.');
  const factor = year === 2024 ? 0.8 : year === 2025 ? 0.9 : 1;
  return usage[partName].map((value, index) => ({
    year, month: index + 1, monthLabel: MONTHS[index], units: Math.round(value * factor),
  }));
}
export function getStockPlan(partName: UsagePart, year: number, month: number, inventory?: readonly StockLine[]) {
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError('Choose month 1–12.');
  const rows = getPartsMonthlyUsage(year, partName);
  const monthlyUsage = rows[month - 1].units;
  const averageMonthlyUsage = rows.reduce((sum, row) => sum + row.units, 0) / rows.length;
  const targetStock = monthlyUsage + SAFETY_STOCK;
  const matching = inventory?.filter((line) => line.part_name.toLowerCase() === partName.toLowerCase());
  const stockOnHand = matching?.reduce((sum, line) => sum + line.quantity, 0) ?? null;
  return {
    partName, year, month, monthLabel: MONTHS[month - 1], monthlyUsage, averageMonthlyUsage,
    safetyBuffer: SAFETY_STOCK, targetStock, stockOnHand,
    suggestedPurchase: stockOnHand == null ? null : Math.max(0, targetStock - stockOnHand),
    belowThreshold: stockOnHand == null ? null : stockOnHand < LOW_STOCK_THRESHOLD,
    vanAlerts: inventory == null ? [] : [1, 2, 3].map((vanId) => {
      const quantity = matching!.filter((line) => line.van_id === vanId).reduce((sum, line) => sum + line.quantity, 0);
      return { vanId, quantity, belowThreshold: quantity < LOW_STOCK_THRESHOLD };
    }),
  };
}

/** A purchase is planned once for the whole fleet, never multiplied by van count. */
export function getInventoryRestockSuggestion(partName: string, year: number, month: number, vanId: number, inventory?: readonly StockLine[]) {
  checkYear(year);
  if (!Number.isInteger(month) || month < 1 || month > 12) throw new RangeError('Choose month 1–12.');
  const supported = USAGE_PARTS.find((part) => part.toLowerCase() === partName.toLowerCase());
  const matching = inventory?.filter((line) => line.part_name.toLowerCase() === partName.toLowerCase());
  const fleetStock = matching?.reduce((sum, line) => sum + line.quantity, 0) ?? null;
  const vanStock = matching?.filter((line) => line.van_id === vanId).reduce((sum, line) => sum + line.quantity, 0) ?? null;
  const plan = supported ? getStockPlan(supported, year, month, inventory) : null;
  const targetStock = plan?.targetStock ?? SAFETY_STOCK;
  return {
    partName, monthlyUsage: plan?.monthlyUsage ?? null,
    averageMonthlyUsage: plan?.averageMonthlyUsage ?? null,
    targetStock, fleetStock, vanStock,
    vanTopUp: vanStock == null ? null : Math.max(0, LOW_STOCK_THRESHOLD - vanStock),
    suggestedBuy: fleetStock == null ? null : Math.max(0, targetStock - fleetStock),
    hasUsageData: supported != null,
  };
}
