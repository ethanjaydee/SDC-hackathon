import { useMemo, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import * as RadioGroup from '@radix-ui/react-radio-group';
import { SkeletonRows, fieldClass } from './shared';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  sort?: (row: T) => string | number;
  className?: string;
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string | number;
  searchText?: (row: T) => string;
  searchLabel?: string;
  toolbar?: ReactNode;
  initialSort?: { key: string; dir: 'asc' | 'desc' };
  pageSize?: number;
  loading?: boolean;
  empty: ReactNode;
  rowProps?: (row: T) => { className?: string; 'data-testid'?: string };
  mobile?: (row: T) => ReactNode;
  caption: string;
};

export function DataTable<T>({
  rows, columns, rowKey, searchText, searchLabel = 'Filter rows', toolbar, initialSort,
  pageSize = 10, loading, empty, rowProps, mobile, caption,
}: Props<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const isMobile = useIsMobile();
  const cards = !!mobile && isMobile;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = q && searchText ? rows.filter((r) => searchText(r).toLowerCase().includes(q)) : rows;
    const col = sort && columns.find((c) => c.key === sort.key);
    if (sort && col?.sort) {
      const get = col.sort;
      out = [...out].sort((a, b) => {
        const x = get(a), y = get(b);
        const r = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
        return sort.dir === 'asc' ? r : -r;
      });
    }
    return out;
  }, [rows, query, sort, columns, searchText]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pages - 1);
  const slice = filtered.slice(current * pageSize, current * pageSize + pageSize);

  const toggle = (key: string) => {
    setPage(0);
    setSort((s) => (s?.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));
  };

  return (
    <div className="min-w-0 space-y-3">
      {(searchText || toolbar) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {searchText && (
            <label className="relative block sm:max-w-xs sm:flex-1">
              <span className="sr-only">{searchLabel}</span>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="search" className={cn(fieldClass, 'pl-8')} placeholder={searchLabel} value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(0); }} data-testid="input-table-filter" />
            </label>
          )}
          {toolbar && <div className="flex flex-wrap items-center gap-2">{toolbar}</div>}
        </div>
      )}

      {loading ? <SkeletonRows rows={5} label={`Loading ${caption}`} /> : !filtered.length ? empty : (
        <>
          {cards ? <ul className="space-y-2" aria-label={caption}>{slice.map((r) => <li key={rowKey(r)}>{mobile!(r)}</li>)}</ul> : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">{caption}</caption>
              <thead className="bg-muted/60 text-left">
                <tr>
                  {columns.map((c) => {
                    const active = sort?.key === c.key;
                    return (
                      <th key={c.key} scope="col" className={cn('px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted-foreground', c.className)}
                        aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                        {c.sort ? (
                          <button type="button" onClick={() => toggle(c.key)} className="inline-flex items-center gap-1 rounded hover:text-foreground">
                            {c.header}
                            {active ? (sort!.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="opacity-50" />}
                          </button>
                        ) : c.header}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {slice.map((r) => {
                  const p = rowProps?.(r) ?? {};
                  return (
                    <tr key={rowKey(r)} data-testid={p['data-testid']} className={cn('border-t transition-colors hover:bg-muted/40', p.className)}>
                      {columns.map((c) => <td key={c.key} className={cn('px-3 py-2.5 align-middle', c.className)}>{c.cell(r)}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>)}
          {filtered.length > pageSize && (
            <nav className="flex items-center justify-between gap-2 text-xs text-muted-foreground" aria-label={`${caption} pages`}>
              <span className="font-mono tabular">{current * pageSize + 1}–{Math.min(filtered.length, (current + 1) * pageSize)} of {filtered.length}</span>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="outline" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Previous page"><ChevronLeft size={14} /></Button>
                <span className="grid place-items-center px-2 font-mono tabular">{current + 1}/{pages}</span>
                <Button type="button" size="sm" variant="outline" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Next page"><ChevronRight size={14} /></Button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export function FilterChips<const V extends string>({ value, options, onChange, label }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void; label: string }) {
  return (
    <RadioGroup.Root value={value} onValueChange={(next) => {
      const option = options.find((item) => item.value === next);
      if (option) onChange(option.value);
    }} aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border bg-muted/50 p-0.5">
      {options.map((o) => (
        <RadioGroup.Item key={o.value} value={o.value}
          className={cn('rounded-md px-2.5 py-1 text-xs font-medium transition-colors', value === o.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
          {o.label}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
