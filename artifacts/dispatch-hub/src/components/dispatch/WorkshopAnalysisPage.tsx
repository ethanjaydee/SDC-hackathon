import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, FlaskConical, Wallet } from 'lucide-react';
import { Card, Mono, PageHead, StatusBadge, fieldClass, type Hub } from './shared';
import {
  ANALYTICS_YEARS, USAGE_PARTS, getPartsMonthlyUsage, getSalesMonthly, getSalesYearly, type UsagePart,
} from './workshopAnalytics';

const C1 = '#61A9BD', C2 = '#CED14E', C3 = '#44986D';
const myr = (n: number) => `MYR ${n.toLocaleString('en-MY', { maximumFractionDigits: 0 })}`;
const axis = { fontSize: 11, fill: 'currentColor' };
const tip = { borderRadius: 8, border: '1px solid hsl(var(--card-border))', background: 'hsl(var(--card))', fontSize: 12 };

export default function WorkshopAnalysisPage({ hub }: Hub) {
  const [year, setYear] = useState<number>(ANALYTICS_YEARS[ANALYTICS_YEARS.length - 1]);
  const [part, setPart] = useState<UsagePart>(USAGE_PARTS[0]);
  const monthly = useMemo(() => getSalesMonthly(year), [year]);
  const yearly = useMemo(() => getSalesYearly(), []);
  const usage = useMemo(() => getPartsMonthlyUsage(year, part), [year, part]);
  const avg = useMemo(() => getPartsMonthlyUsage(year, part).reduce((sum, row) => sum + row.units, 0) / 12, [year, part]);
  const usageData = usage.map((u) => ({ ...u, average: Number(avg.toFixed(1)) }));

  return (
    <div className="space-y-5">
      <PageHead kicker="Workshop" title="Workshop analysis" sub="Sample sales revenue and accessory usage trends.">
        <label className="sr-only" htmlFor="wa-year">Sample year</label>
        <select id="wa-year" className={`${fieldClass} w-auto`} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {ANALYTICS_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </PageHead>
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-4 py-2 text-xs text-muted-foreground" role="note">
        <FlaskConical size={13} className="mt-0.5 shrink-0" /> Fictional workshop sales and usage figures for demonstration, not accounting records. Stock on hand comes from the hub inventory when available. Nothing here changes inventory.
      </p>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card title={<><Wallet size={15} /> Monthly sales revenue · {year}</>} aside={<StatusBadge tone="pending">Sample data</StatusBadge>}>
          <div className="h-64 w-full" role="img" aria-label={`Area chart of fictional monthly sales revenue in MYR for ${year}`}>
            <ResponsiveContainer>
              <AreaChart data={monthly} margin={{ left: 4, right: 8, top: 8 }}>
                <defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C1} stopOpacity={0.55} /><stop offset="100%" stopColor={C1} stopOpacity={0.05} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="monthLabel" tick={axis} tickLine={false} />
                <YAxis domain={[0, 'auto']} tick={axis} tickLine={false} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} label={{ value: 'MYR', angle: -90, position: 'insideLeft', fontSize: 10 }} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [myr(v), 'Sales revenue']} />
                <Area type="monotone" dataKey="salesMyr" name="Sales revenue (MYR)" stroke={C1} strokeWidth={2} fill="url(#salesFill)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Annual sales revenue" aside={<StatusBadge tone="pending">Sample data</StatusBadge>}>
          <div className="h-64 w-full" role="img" aria-label="Column chart of fictional annual sales revenue in MYR">
            <ResponsiveContainer>
              <BarChart data={yearly} margin={{ left: 4, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.25} vertical={false} />
                <XAxis dataKey="year" tick={axis} tickLine={false} />
                <YAxis domain={[0, 'auto']} tick={axis} tickLine={false} width={56} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                <Tooltip contentStyle={tip} formatter={(v: number) => [myr(v), 'Sales revenue']} />
                <Bar dataKey="salesMyr" name="Sales revenue (MYR)" fill={C3} radius={[4, 4, 0, 0]} isAnimationActive={false} />
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

    </div>
  );
}
