/** Fictional workshop sales and inventory planning examples, not accounting or usage records. */
export const ANALYTICS_YEARS = [2024, 2025, 2026] as const;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export const SAFETY_STOCK = 5;
export const LOW_STOCK_THRESHOLD = 5;
export const USAGE_PARTS = ['AC Capacitor 35uF', 'LED Bulb E27', 'AC Filter', 'Drain Hose', 'AC Control Board', 'AAA Battery'] as const;
export type UsagePart = typeof USAGE_PARTS[number];
export type StockLine = { van_id: number; part_name: string; quantity: number };

const salesRevenueMyr: Record<number, readonly number[]> = {
  2024: [65000, 68000, 72000, 74000, 78000, 82000, 85000, 89000, 86000, 91000, 97000, 105000],
  2025: [79000, 82000, 87000, 89000, 94000, 98000, 102000, 108000, 105000, 112000, 118000, 128000],
  2026: [91000, 95000, 99000, 103000, 108000, 111000, 115000, 119000, 117000, 124000, 133000, 148000],
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
export function getSalesMonthly(year: number) {
  checkYear(year);
  return salesRevenueMyr[year].map((salesMyr, index) => ({ year, month: index + 1, monthLabel: MONTHS[index], salesMyr }));
}
export function getSalesYearly() {
  return ANALYTICS_YEARS.map((year) => ({ year, salesMyr: salesRevenueMyr[year].reduce((sum, value) => sum + value, 0) }));
}
export function getSalesYtd(year: number, throughMonth: number) {
  if (!Number.isInteger(throughMonth) || throughMonth < 1 || throughMonth > 12) throw new RangeError('Choose month 1–12.');
  return getSalesMonthly(year).slice(0, throughMonth).reduce((sum, row) => sum + row.salesMyr, 0);
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
