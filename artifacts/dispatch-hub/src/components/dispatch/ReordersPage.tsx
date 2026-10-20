import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, PackageCheck, ShoppingBag } from 'lucide-react';
import { Link } from 'wouter';
import {
  getListReorderDraftsQueryKey,
  useApproveReorderDraft,
  type ReorderDraft,
} from '@workspace/api-client-react';
import { Card, PageHead, dateTime, type Hub } from './shared';

const ringgit = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' });
const APPROVER = 'Demo Dispatcher';

export default function ReordersPage({ hub }: Hub) {
  const queryClient = useQueryClient();
  const approve = useApproveReorderDraft();
  const { reorders, reordersQ } = hub;
  const open = reorders.filter((reorder) => reorder.status === 'Draft');
  const approved = reorders.filter((reorder) => reorder.status === 'Approved');

  const approveDraft = async (reorder: ReorderDraft) => {
    const staleNote = reorder.offer_stale
      ? '\n\nThis price is over 24 hours old. Confirm with the supplier before proceeding.'
      : '';
    if (!window.confirm(`Approve reorder draft #${reorder.id} for ${reorder.requested_quantity} × ${reorder.part_name} from ${reorder.supplier_name}?${staleNote}\n\nThis will record an approval only. Van inventory will not change.`)) return;
    try {
      await approve.mutateAsync({ id: reorder.id, data: { approved_by: APPROVER } });
      await queryClient.invalidateQueries({ queryKey: getListReorderDraftsQueryKey() });
    } catch {
      void queryClient.invalidateQueries({ queryKey: getListReorderDraftsQueryKey() });
    }
  };

  const renderReorder = (reorder: ReorderDraft) => {
    const estimatedTotal = reorder.unit_price_myr * reorder.requested_quantity;
    return (
      <article className="af-reorder-card" key={reorder.id} data-testid={`reorder-${reorder.id}`}>
        <div className="af-reorder-card-head">
          <div>
            <p className="af-reorder-label">Reorder #{reorder.id} · Van {reorder.van_id}</p>
            <h3>{reorder.part_name}</h3>
          </div>
          <span className={`af-reorder-status ${reorder.status === 'Approved' ? 'approved' : ''}`}>
            {reorder.status === 'Approved' ? <CheckCircle2 size={12} /> : <Clock3 size={12} />}
            {reorder.status}
          </span>
        </div>
        <div className="af-reorder-summary">
          <div><span>On hand when drafted</span><strong>{reorder.quantity_on_hand}</strong></div>
          <div><span>Requested quantity</span><strong>{reorder.requested_quantity}</strong></div>
          <div><span>Captured price / unit</span><strong>{ringgit.format(reorder.unit_price_myr)}</strong></div>
          <div><span>Estimated total</span><strong>{ringgit.format(estimatedTotal)}</strong></div>
        </div>
        <div className="af-reorder-supplier">
          <ShoppingBag size={14} />
          <div>
            <strong>{reorder.supplier_name}</strong>
            <a href={reorder.product_url} target="_blank" rel="noopener noreferrer">{reorder.product_name}</a>
          </div>
        </div>
        <div className="af-reorder-meta">
          <span>{ringgit.format(reorder.pack_price_myr)} / pack{reorder.package_quantity ? ` · ${reorder.package_quantity} per pack` : ''}</span>
          {reorder.minimum_order_packs != null && <span>Minimum {reorder.minimum_order_packs} pack{reorder.minimum_order_packs === 1 ? '' : 's'}</span>}
          {reorder.shipping_myr != null && <span>{ringgit.format(reorder.shipping_myr)} shipping</span>}
          <span>{reorder.availability_note}</span>
          <span>Offer checked {dateTime(reorder.offer_checked_at)}</span>
        </div>
        {reorder.offer_stale && <p className="af-reorder-warning"><AlertTriangle size={13} /> Price snapshot is over 24 hours old. Confirm current price and availability before ordering.</p>}
        <div className="af-reorder-card-foot">
          <span>Drafted {dateTime(reorder.created_at)} by {reorder.created_by}</span>
          {reorder.status === 'Approved'
            ? <span>Approved {reorder.approved_at ? dateTime(reorder.approved_at) : ''} by {reorder.approved_by}</span>
            : <button
              type="button"
              className="af-reorder-approve"
              disabled={approve.isPending}
              onClick={() => void approveDraft(reorder)}
            ><PackageCheck size={13} /> Approve request</button>}
        </div>
      </article>
    );
  };

  return (
    <div className="af-page">
      <PageHead
        kicker="Purchasing"
        title="Reorder requests"
        sub="Review the stock line, supplier offer, quantity, and price snapshot before approval. These records never change van inventory."
      >
        <Link href="/stock/low" className="af-supplier-shortcut">Review low stock <ArrowRight size={13} /></Link>
      </PageHead>

      {approve.isError && <p className="af-error" role="alert">The reorder approval could not be saved. Refresh and try again.</p>}
      <Card title="Drafts awaiting review" aside={<span className="af-mono">{open.length} open</span>}>
        {reordersQ.isLoading && !reordersQ.data
          ? <p className="af-hint" role="status">Loading reorder requests…</p>
          : reordersQ.isError && !reordersQ.data
            ? <p className="af-error" role="alert">Reorder requests could not be loaded. Refresh the page to try again.</p>
            : open.length ? <div className="af-reorder-list">{open.map(renderReorder)}</div>
              : <div className="af-empty-log">No reorder drafts need review. Start from the low-stock lines to compare suppliers and save a draft.</div>}
      </Card>

      <Card title="Approved requests" aside={<span className="af-mono">{approved.length} approved</span>} className="af-reorder-approved">
        {approved.length
          ? <div className="af-reorder-list">{approved.map(renderReorder)}</div>
          : <div className="af-empty-log">Approved requests will be recorded here. Approval does not receive parts into van stock.</div>}
      </Card>
    </div>
  );
}
