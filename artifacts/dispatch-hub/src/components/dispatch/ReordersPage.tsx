import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ClipboardList, ExternalLink, PackageCheck } from 'lucide-react';
import { getListReorderDraftsQueryKey, useApproveReorderDraft, type ReorderDraft } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { isOfferStale } from '@/lib/reliability';
import { Card, ConfirmAction, EmptyState, InlineError, Mono, PageHead, SkeletonRows, StatusBadge, dateTime, errorText, fieldClass, type Hub } from './shared';
import { FilterChips } from './DataTable';

const ringgit = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' });
const APPROVER = 'Demo Dispatcher';
const PAGE = 6;
type SortKey = 'newest' | 'oldest' | 'total';

export default function ReordersPage({ hub }: Hub) {
  const queryClient = useQueryClient();
  const approve = useApproveReorderDraft();
  const lock = useRef(false);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [approveError, setApproveError] = useState('');
  const [view, setView] = useState<'Draft' | 'Approved'>('Draft');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(0);
  const { reorders, reordersQ, writePending } = hub;
  const open = reorders.filter((r) => r.status === 'Draft');
  const approved = reorders.filter((r) => r.status === 'Approved');
  const q = query.trim().toLowerCase();
  const list = (view === 'Draft' ? open : approved)
    .filter((r) => !q || `${r.id} ${r.part_name} ${r.supplier_name} ${r.product_name} van ${r.van_id}`.toLowerCase().includes(q))
    .sort((a, b) => sort === 'total' ? b.unit_price_myr * b.requested_quantity - a.unit_price_myr * a.requested_quantity
      : sort === 'oldest' ? a.id - b.id : b.id - a.id);
  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = list.slice(cur * PAGE, cur * PAGE + PAGE);

  const approveDraft = async (r: ReorderDraft) => {
    if (lock.current) return; // synchronous same-tick lock
    lock.current = true;
    setApprovingId(r.id);
    setApproveError('');
    try {
      await approve.mutateAsync({ id: r.id, data: { approved_by: APPROVER } });
    } catch (error) {
      setApproveError(errorText(error, 'The reorder approval could not be saved.'));
    } finally {
      await queryClient.invalidateQueries({ queryKey: getListReorderDraftsQueryKey() });
      lock.current = false;
      setApprovingId(null);
    }
  };

  const render = (r: ReorderDraft) => {
    const total = r.unit_price_myr * r.requested_quantity;
    const stale = isOfferStale(r.offer_checked_at, r.offer_stale);
    const busy = approvingId === r.id;
    return (
      <article key={r.id} data-testid={`reorder-${r.id}`} className="dh-rise min-w-0 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[11px] text-muted-foreground">REORDER #{r.id} · V-{r.van_id}</p>
            <h3 className="truncate text-lg font-semibold">{r.part_name}</h3>
          </div>
          <StatusBadge tone={r.status === 'Approved' ? 'ok' : 'pending'}>{r.status}</StatusBadge>
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-4">
          {[['On hand when drafted', String(r.quantity_on_hand)], ['Requested', String(r.requested_quantity)], ['Price / unit', ringgit.format(r.unit_price_myr)], ['Est. total', ringgit.format(total)]].map(([k, v]) => (
            <div key={k}><dt className="text-muted-foreground">{k}</dt><dd className="font-mono text-sm font-semibold tabular">{v}</dd></div>
          ))}
        </dl>
        <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
          <strong className="block">{r.supplier_name}</strong>
          <a href={r.product_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">{r.product_name} <ExternalLink size={11} /></a>
          <p className="mt-1 text-xs text-muted-foreground">
            {ringgit.format(r.pack_price_myr)} / pack{r.package_quantity ? ` · ${r.package_quantity} per pack` : ''}
            {r.minimum_order_packs != null && ` · min ${r.minimum_order_packs} pack${r.minimum_order_packs === 1 ? '' : 's'}`}
            {r.shipping_myr != null && ` · ${ringgit.format(r.shipping_myr)} shipping`} · {r.availability_note}
          </p>
          <p className="text-xs text-muted-foreground">Offer checked <Mono>{dateTime(r.offer_checked_at)}</Mono></p>
        </div>
        {stale && <p className="mt-2 flex items-start gap-1.5 text-xs text-pending"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Price snapshot is over 24 hours old. Confirm current price and availability before ordering.</p>}
        <div className="mt-3 flex flex-col gap-2 border-t pt-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>Drafted <Mono>{dateTime(r.created_at)}</Mono> by {r.created_by}</span>
          {r.status === 'Approved'
            ? <span>Approved {r.approved_at && <Mono>{dateTime(r.approved_at)}</Mono>} by {r.approved_by}</span>
            : (
              <ConfirmAction
                title={`Approve reorder #${r.id}?`}
                description={<>
                  <p><Mono>{r.requested_quantity}</Mono> x {r.part_name} from {r.supplier_name} · est. <Mono>{ringgit.format(total)}</Mono>.</p>
                  {isOfferStale(r.offer_checked_at, r.offer_stale) && <p className="text-pending">This price is over 24 hours old. Confirm with the supplier before proceeding.</p>}
                  <p>This records an approval only. Van inventory will not change.</p>
                </>}
                confirmLabel="Approve request"
                onConfirm={() => void approveDraft(r)}
                trigger={<Button type="button" size="sm" disabled={approvingId !== null || writePending} data-testid={`button-approve-reorder-${r.id}`}><PackageCheck size={13} /> {busy ? 'Approving…' : 'Approve request'}</Button>}
              />
            )}
        </div>
      </article>
    );
  };

  return (
    <div className="space-y-5">
      <PageHead kicker="Purchasing" title="Reorder requests" sub="Review existing stock requests and approvals. These records never change van inventory." />
      {approveError && <InlineError>{approveError}</InlineError>}
      <Card title={<><ClipboardList size={15} /> {view === 'Draft' ? 'Drafts awaiting review' : 'Approved requests'}</>} aside={<Mono>{open.length} open · {approved.length} approved</Mono>}>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <FilterChips label="Request status" value={view} onChange={(v) => { setView(v); setPage(0); }} options={[{ value: 'Draft', label: `Drafts (${open.length})` }, { value: 'Approved', label: `Approved (${approved.length})` }]} />
          <input type="search" className={`${fieldClass} sm:max-w-xs`} placeholder="Search part, supplier, ID" aria-label="Search reorder requests" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
          <select className={`${fieldClass} sm:w-auto`} aria-label="Sort reorder requests" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="total">Highest total</option>
          </select>
        </div>
        {reordersQ.isLoading && !reordersQ.data ? <SkeletonRows rows={4} label="Loading reorder requests" />
          : reordersQ.isError && !reordersQ.data ? <InlineError onRetry={() => void reordersQ.refetch()} retrying={reordersQ.isFetching}>Reorder requests could not be loaded.</InlineError>
          : shown.length ? <div className="grid gap-3 xl:grid-cols-2">{shown.map(render)}</div>
          : <EmptyState icon={<ClipboardList size={16} />} title={view === 'Draft' ? 'No reorder drafts need review' : 'No approved requests yet'}>
              {view === 'Draft' ? 'No new reorder drafts can be created from the technician dashboard.' : 'Approval does not receive parts into van stock.'}
            </EmptyState>}
        {list.length > PAGE && (
          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <Mono>{cur * PAGE + 1}–{Math.min(list.length, (cur + 1) * PAGE)} of {list.length}</Mono>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
