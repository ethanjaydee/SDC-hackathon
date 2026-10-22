import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, Boxes, FlaskConical, Wallet } from 'lucide-react';
import { Card, Mono, PageHead, StatusBadge, fieldClass, type Hub } from './shared';
import {
  ANALYTICS_YEARS, LOW_STOCK_THRESHOLD, MONTHS, USAGE_PARTS, getPartsMonthlyUsage, getSalaryMonthly, getSalaryYearly, getStockPlan, type UsagePart,
} from './workshopAnalytics';

const C1 = '#61A9BD', C2 = '#CED14E', C3 = '#44986D';
const myr = (n: number) => `MYR ${n.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`;
const axis = { fontSize: 11, fill: 'currentColor' };
const tip = { borderRadius: 8, border: '1px solid hsl(var(--card-border))', background: 'hsl(var(--card))', fontSize: 12 };

export default function WorkshopAnalysisPage({ hub }: Hub) {
  const [year, setYear] = useState<number>(ANALYTICS_YEARS[ANALYTICS_YEARS.length - 1]);
  const [part, setPart] = useState<UsagePart>(USAGE_PARTS[0]);
  const [month, setMonth] = useState(1);
  const monthly = useMemo(() => getSalaryMonthly(year), [year]);
  const yearly = useMemo(() => getSalaryYearly(), []);
  const usage = useMemo(() => getPartsMonthlyUsage(year, part), [year, part]);
  const inv = hub.hubQ.data?.inventory;
  const plan = useMemo(() => getStockPlan(part, year, month, inv), [part, year, month, inv]);
  const allPlans = useMemo(() => USAGE_PARTS.map((p) => getStockPlan(p, year, month, inv)), [year, month, inv]);
  const avg = plan.averageMonthlyUsage;
  const usageData = usage.map((u) => ({ ...u, average: Number(avg.toFixed(1)) }));

  return (
    <div className="space-y-5">
      <PageHead kicker="Workshop" title="Workshop analysis" sub="Payroll cost and accessory usage trends, with a restock plan against live van stock.">
        <label className="sr-only" htmlFor="wa-year">Sample year</label>
        <select id="wa-year" className={`${fieldClass} w-auto`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {ANALYTICS_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </PageHead>
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-xs text-muted-foreground" role="note">
        <FlaskConical size={13} className="mt-0.5 shrink-0" /> Fictional payroll and usage figures for demonstration. Stock on hand comes from the hub inventory when available. Nothing here changes inventory.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title={<><Wallet size={15} /> Monthly salary cost · {year}</>} aside={<StatusBadge tone="pending">Fictional</StatusBadge>}>
          <div className="h-64 w-full" role="img" aria-label={`Area chart of fictional monthly salary cost in MYR for ${year}`}>
            <ResponsiveContainer>
              <AreaChart data={monthly} margin={{ left: 4, right: 8, top: 8 }}>
                <defs><linearGradient id="salFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C1} stopOpacity={0.55} /><stop offset="100%" stopColor={C1} stopOpacity={0.05} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="monthLabel" tick={axis} tickLine={false} />
                <YAxis domain={[0, 'auto']} tick={axis} tickLine={false} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} label={{ value: 'MYR', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [myr(v), 'Salary cost']} />
                <Area type="monotone" dataKey="salaryMyr" name="Salary cost (MYR)" stroke={C1} strokeWidth={2} fill="url(#salFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Annual salary cost" aside={<StatusBadge tone="pending">Fictional</StatusBadge>}>
          <div className="h-64 w-full" role="img" aria-label="Column chart of fictional annual salary cost in MYR">
            <ResponsiveContainer>
              <BarChart data={yearly} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="year" tick={axis} tickLine={false} />
                <YAxis domain={[0, 'auto']} tick={axis} tickLine={false} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [myr(v), 'Salary cost']} />
                <Bar dataKey="salaryMyr" name="Salary cost (MYR)" fill={C3} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title={<><BarChart3 size={15} /> Accessory usage · {year}</>} aside={<StatusBadge tone="pending">Fictional usage</StatusBadge>}>
        <div className="mb-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="wa-part">Accessory</label>
          <select id="wa-part" className={`${fieldClass} w-auto`} value={part} onChange={(e) => setPart(e.target.value as UsagePart)}>
            {USAGE_PARTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <Mono className="self-center text-xs text-muted-foreground">Monthly average {avg.toFixed(1)} units</Mono>
        </div>
        <div className="h-64 w-full" role="img" aria-label={`Column chart of ${part} units used per month in ${year}`}>
          <ResponsiveContainer>
            <BarChart data={usageData} margin={{ left: 4, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} vertical={false} />
              <XAxis dataKey="monthLabel" tick={axis} tickLine={false} />
              <YAxis domain={[0, 'auto']} tick={axis} tickLine={false} width={40} label={{ value: 'Units', angle: -90, position: 'insideLeft', fontSize: 10 }} />
              <Tooltip contentStyle={tip} formatter={(v: number, n: string) => [`${v} units`, n]} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="units" name="Units used" fill={C1} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              <Bar dataKey="average" name="Yearly monthly average" fill={C2} radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title={<><Boxes size={15} /> Restock plan</>} aside={<span className="text-xs">Target = month usage + 5 spare · alert below {LOW_STOCK_THRESHOLD}</span>}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="wa-month">Plan month</label>
          <select id="wa-month" className={`${fieldClass} w-auto`} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m} {year}</option>)}
          </select>
          {!inv && <StatusBadge tone="pending">Live stock unavailable</StatusBadge>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr className="border-b text-left text-xs text-muted-foreground">
              <th className="py-2 font-medium">Accessory</th><th className="font-medium">Usage ({MONTHS[month - 1]})</th><th className="font-medium">Target</th>
              <th className="font-medium">Fleet stock</th><th className="font-medium">Suggested buy</th><th className="font-medium">Van alerts</th>
            </tr></thead>
            <tbody>
              {allPlans.map((p) => {
                const alerts = p.vanAlerts.filter((v) => v.belowThreshold);
                return (
                  <tr key={p.partName} className="border-b border-card-border align-top">
                    <td className="py-2 font-medium">{p.partName}</td>
                    <td className="font-mono tabular">{p.monthlyUsage}</td>
                    <td className="font-mono tabular">{p.targetStock}</td>
                    <td className="font-mono tabular">{p.stockOnHand ?? 'Unknown'}{p.belowThreshold && <span className="ml-1.5"><StatusBadge tone="err">Below {LOW_STOCK_THRESHOLD}</StatusBadge></span>}</td>
                    <td className="font-mono tabular">{p.suggestedPurchase ?? 'Unknown'}</td>
                    <td className="text-xs">{p.stockOnHand == null ? <span className="text-muted-foreground">Unknown</span>
                      : alerts.length ? <span className="text-err">{alerts.map((v) => `Van ${v.vanId}: ${v.quantity}`).join(' · ')}</span> : <span className="text-muted-foreground">None</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Fleet stock is the total across vans; van alerts flag any single van strictly below {LOW_STOCK_THRESHOLD}. Suggested buy is advisory only and never changes inventory.</p>
      </Card>
    </div>
  );
}
