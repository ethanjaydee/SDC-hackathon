import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowUpRight, BadgeCheck, Loader2, PackagePlus, Plus, RefreshCw, ShoppingBag, Star } from 'lucide-react';
import {
  getListReorderDraftsQueryKey,
  getListSupplierCatalogProvidersQueryKey,
  getListSupplierQuotesQueryKey,
  getSearchSupplierCatalogQueryKey,
  useListSupplierCatalogProviders,
  useListSupplierQuotes,
  useSearchSupplierCatalog,
  useCreateReorderDraft,
  useSaveSupplierQuote,
  type SupplierQuoteInput,
  type ReorderDraftInput,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isOfferStale, pollInterval } from '@/lib/reliability';
import { positiveQuantitySchema, supplierQuoteSchema } from '@/lib/validation';
const OfferSortChips = FilterChips<'quality' | 'price'>;
const OfferFilterChips = FilterChips<'all' | 'available' | 'captured' | 'live'>;
import { cn } from '@/lib/utils';
import { Card, EmptyState, InlineError, Mono, PageHead, SkeletonRows, StatusBadge, errorText, fieldClass, type Hub, type Tone } from './shared';
import { FilterChips } from './DataTable';

type OfferForm = {
  partNumber: string; productName: string; supplierName: string; productUrl: string; priceMyr: string;
  availabilityNote: string; packageQuantity: string; minimumOrderPacks: string; shippingMyr: string;
  qualityRating: string; qualityEvidence: string;
};
const emptyForm: OfferForm = {
  partNumber: '', productName: '', supplierName: '', productUrl: '', priceMyr: '', availabilityNote: 'Not checked',
  packageQuantity: '1', minimumOrderPacks: '1', shippingMyr: '', qualityRating: '', qualityEvidence: '',
};
const pathToField: Record<string, keyof OfferForm> = {
  part_number: 'partNumber', product_name: 'productName', supplier_name: 'supplierName', product_url: 'productUrl',
  price_myr: 'priceMyr', availability_note: 'availabilityNote', package_quantity: 'packageQuantity',
  minimum_order_packs: 'minimumOrderPacks', shipping_myr: 'shippingMyr', quality_rating: 'qualityRating',
  quality_evidence_note: 'qualityEvidence',
};
const ringgit = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' });
const PAGE = 8;
const availTone = (a: string): Tone => (a === 'In stock' ? 'ok' : a === 'Out of stock' ? 'err' : a === 'Limited stock' ? 'pending' : 'idle');

type ComparisonOffer = {
  id: string; sourceType: 'captured_quote' | 'live_catalog'; supplierName: string; productName: string; productUrl: string;
  priceMyr: number; packPrice: number; packageQuantity: number | null; unitLabel: string | null; minimumOrderPacks: number | null;
  shippingMyr: number | null; availabilityNote: string; checkedAt: string; sourceUpdatedAt: string | null; stale: boolean;
  qualityRating: number | null; qualityEvidence: string | null; partNumber: string | null;
};

function unitPrice(o: { price_myr: number; package_quantity?: number | null; minimum_order_packs?: number | null; shipping_myr?: number | null }) {
  const units = (o.package_quantity ?? 1) * (o.minimum_order_packs ?? 1);
  return (o.price_myr * (o.minimum_order_packs ?? 1) + (o.shipping_myr ?? 0)) / units;
}
const num = (v: string) => (v.trim() === '' ? Number.NaN : Number(v));

function Field({ id, label, error, children, wide, hint }: { id: string; label: ReactNode; error?: string; children: ReactNode; wide?: boolean; hint?: string }) {
  return (
    <div className={cn('space-y-1', wide && 'sm:col-span-2')}>
      <label htmlFor={id} className="text-xs font-medium">{label}</label>
      {children}
      {error ? <p id={`${id}-error`} className="text-xs text-err">{error}</p> : hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export default function SupplierComparePage({ hub }: Hub) {
  const parts = useMemo(() => [...new Set(hub.inventory.map((i) => i.part_name))].sort(), [hub.inventory]);
  const requestedInventoryId = Number(new URLSearchParams(window.location.search).get('inventory_id'));
  const reorderStockLine = Number.isSafeInteger(requestedInventoryId) && requestedInventoryId > 0 ? hub.inventory.find((i) => i.id === requestedInventoryId) : undefined;
  const [selectedPart, setSelectedPart] = useState(() => new URLSearchParams(window.location.search).get('part') || '');
  const [reorderQuantity, setReorderQuantity] = useState('');
  const [qtyError, setQtyError] = useState('');
  const [reorderError, setReorderError] = useState('');
  const [sortMode, setSortMode] = useState<'quality' | 'price'>('quality');
  const [avail, setAvail] = useState<'all' | 'available' | 'captured' | 'live'>('all');
  const [page, setPage] = useState(0);
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [errors, setErrors] = useState<Partial<Record<keyof OfferForm, string>>>({});
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const draftLock = useRef(false);
  const saveLock = useRef(false);
  const supplierSelectionInitialized = useRef(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const partName = selectedPart || reorderStockLine?.part_name || parts[0] || '';
  const providersQuery = useListSupplierCatalogProviders({ query: { queryKey: getListSupplierCatalogProvidersQueryKey(), staleTime: 60_000 } });
  useEffect(() => {
    const providers = providersQuery.data?.providers;
    if (!providers || supplierSelectionInitialized.current) return;
    supplierSelectionInitialized.current = true;
    const availableIds = providers.map((p) => p.id);
    let savedIds: string[] = [];
    let hasSaved = false;
    try {
      const stored = window.localStorage.getItem('dispatch-selected-supplier-feeds');
      if (stored != null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) { savedIds = parsed.filter((id): id is string => typeof id === 'string'); hasSaved = true; }
      }
    } catch { savedIds = []; }
    setSelectedSupplierIds(hasSaved ? savedIds.filter((id) => availableIds.includes(id)) : availableIds);
  }, [providersQuery.data]);
  const quotesQuery = useListSupplierQuotes({ query: partName }, {
    query: { queryKey: getListSupplierQuotesQueryKey({ query: partName }), enabled: partName.trim().length >= 2, refetchOnWindowFocus: true },
  });
  const catalogQuery = useSearchSupplierCatalog({ query: partName, supplier_ids: selectedSupplierIds }, {
    query: {
      queryKey: getSearchSupplierCatalogQueryKey({ query: partName, supplier_ids: selectedSupplierIds }),
      enabled: partName.trim().length >= 2 && selectedSupplierIds.length > 0,
      refetchInterval: pollInterval(5 * 60 * 1000),
      refetchOnWindowFocus: true,
    },
  });
  const saveQuote = useSaveSupplierQuote();
  const createReorder = useCreateReorderDraft();
  useEffect(() => { if (reorderStockLine && !selectedPart) setSelectedPart(reorderStockLine.part_name); }, [reorderStockLine, selectedPart]);
  useEffect(() => { setPage(0); }, [partName, sortMode, avail]);

  const offers = useMemo(() => {
    const captured: ComparisonOffer[] = (quotesQuery.data?.quotes ?? []).map((o) => ({
      id: `quote-${o.id}`, sourceType: 'captured_quote', supplierName: o.supplier_name, productName: o.product_name, productUrl: o.product_url,
      priceMyr: unitPrice(o), packPrice: o.price_myr, packageQuantity: o.package_quantity, unitLabel: null, minimumOrderPacks: o.minimum_order_packs,
      shippingMyr: o.shipping_myr, availabilityNote: o.availability_note, checkedAt: o.checked_at, sourceUpdatedAt: null,
      stale: isOfferStale(o.checked_at), qualityRating: o.quality_rating, qualityEvidence: o.quality_evidence_note, partNumber: o.part_number,
    }));
    const live: ComparisonOffer[] = (catalogQuery.data?.suppliers ?? []).flatMap((s) => s.offers).map((o) => ({
      id: `live-${o.id}`, sourceType: 'live_catalog', supplierName: o.supplier_name, productName: o.product_name, productUrl: o.product_url,
      priceMyr: unitPrice(o), packPrice: o.price_myr, packageQuantity: o.package_quantity, unitLabel: o.unit_label, minimumOrderPacks: null,
      shippingMyr: null, availabilityNote: o.availability_note, checkedAt: o.checked_at, sourceUpdatedAt: o.source_updated_at,
      stale: isOfferStale(o.checked_at, o.is_stale), qualityRating: null, qualityEvidence: null, partNumber: null,
    }));
    const result = [...captured, ...live];
    result.sort((a, b) => sortMode === 'price'
      ? a.priceMyr - b.priceMyr || (b.qualityRating ?? 0) - (a.qualityRating ?? 0)
      : (b.qualityRating ?? 0) - (a.qualityRating ?? 0) || a.priceMyr - b.priceMyr);
    return result;
  }, [catalogQuery.data, quotesQuery.data, sortMode]);
  const bestId = sortMode === 'quality' ? offers.find((o) => o.qualityRating != null)?.id : offers[0]?.id;
  const filtered = offers.filter((o) => avail === 'all' ? true : avail === 'available' ? o.availabilityNote !== 'Out of stock'
    : avail === 'captured' ? o.sourceType === 'captured_quote' : o.sourceType === 'live_catalog');
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * PAGE, cur * PAGE + PAGE);
  const suppliersWithErrors = (catalogQuery.data?.suppliers ?? []).filter((s) => s.status === 'error');
  const partMatches = !!reorderStockLine && partName.toLowerCase() === reorderStockLine.part_name.toLowerCase();
  const defaultQty = reorderStockLine ? String(Math.max(1, 5 - reorderStockLine.quantity)) : '1';
  const qtyValue = reorderQuantity === '' ? defaultQty : reorderQuantity;

  const toggleSupplier = (id: string) => setSelectedSupplierIds((current) => {
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    try { window.localStorage.setItem('dispatch-selected-supplier-feeds', JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });
  const setField = (key: keyof OfferForm, value: string) => {
    setForm((c) => ({ ...c, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const inputProps = (key: keyof OfferForm) => ({
    id: `quote-${key}`, value: form[key], className: fieldClass,
    'aria-invalid': !!errors[key], 'aria-describedby': errors[key] ? `quote-${key}-error` : undefined,
    onChange: (e: { target: { value: string } }) => setField(key, e.target.value),
  });

  const createDraft = async (offer: ComparisonOffer) => {
    if (!reorderStockLine || !partMatches || draftLock.current) return;
    const q = positiveQuantitySchema.safeParse(qtyValue);
    if (!q.success) { setQtyError(q.error.issues[0]?.message ?? 'Enter a valid quantity.'); return; }
    draftLock.current = true;
    setDraftingId(offer.id);
    setReorderError('');
    const input: ReorderDraftInput = {
      inventory_id: reorderStockLine.id, part_name: partName, source_type: offer.sourceType, source_offer_id: offer.id,
      supplier_name: offer.supplierName, product_name: offer.productName, product_url: offer.productUrl,
      unit_price_myr: offer.priceMyr, pack_price_myr: offer.packPrice, package_quantity: offer.packageQuantity,
      minimum_order_packs: offer.minimumOrderPacks, shipping_myr: offer.shippingMyr,
      availability_note: offer.availabilityNote as ReorderDraftInput['availability_note'],
      offer_checked_at: offer.checkedAt, offer_stale: offer.stale, requested_quantity: q.data,
    };
    try {
      await createReorder.mutateAsync({ data: input });
      await queryClient.invalidateQueries({ queryKey: getListReorderDraftsQueryKey() });
      toast({ title: 'Reorder draft saved', description: `${input.requested_quantity} x ${reorderStockLine.part_name} from ${offer.supplierName}. Van stock is unchanged.` });
      navigate('/reorders');
    } catch (error) {
      setReorderError(errorText(error, 'The reorder draft could not be saved.'));
    } finally {
      draftLock.current = false;
      setDraftingId(null);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partName || saveLock.current) return;
    const body = {
      search_term: partName, part_name: partName,
      part_number: form.partNumber.trim() || null,
      product_name: form.productName, supplier_name: form.supplierName, product_url: form.productUrl,
      price_myr: num(form.priceMyr),
      availability_note: form.availabilityNote,
      package_quantity: num(form.packageQuantity),
      minimum_order_packs: num(form.minimumOrderPacks),
      shipping_myr: form.shippingMyr.trim() === '' ? null : Number(form.shippingMyr),
      quality_rating: num(form.qualityRating),
      quality_evidence_note: form.qualityEvidence,
    };
    const parsed = supplierQuoteSchema.safeParse(body);
    if (!parsed.success) {
      const next: Partial<Record<keyof OfferForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = pathToField[String(issue.path[0])];
        if (key && !next[key]) next[key] = key === 'qualityRating' ? 'Choose a score from 1 to 5.' : issue.message === 'Expected number, received nan' ? 'Enter a number.' : issue.message;
      }
      setErrors(next);
      const first = Object.keys(next)[0];
      if (first) document.getElementById(`quote-${first}`)?.focus();
      return;
    }
    setErrors({});
    saveLock.current = true;
    const input = parsed.data as SupplierQuoteInput;
    try {
      await saveQuote.mutateAsync({ data: input });
      await queryClient.invalidateQueries({ queryKey: getListSupplierQuotesQueryKey({ query: partName }) });
      setForm(emptyForm);
      toast({ title: 'Supplier offer saved', description: `Added ${input.supplier_name} to the ${partName} comparison.` });
    } catch (error) {
      toast({ title: 'Could not save supplier offer', description: errorText(error, 'Check the details and try again.'), variant: 'destructive' });
    } finally {
      saveLock.current = false;
    }
  };

  const loading = quotesQuery.isLoading || (selectedSupplierIds.length > 0 && catalogQuery.isLoading);

  return (
    <div className="space-y-5">
      <PageHead kicker="Purchasing" title="Compare store offers" sub="The same spare part across suppliers, using captured price and quality evidence." />
      <p className="flex items-start gap-2 rounded-lg border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground">
        <ShoppingBag size={14} className="mt-0.5 shrink-0" />
        <span><strong className="text-foreground">Live feeds and captured offers.</strong> Catalog prices refresh from configured feeds every five minutes. Confirm current price and stock with the supplier before ordering.</span>
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card title="Part comparison" aside={<Mono>{filtered.length} offers</Mono>}>
          <div className="space-y-4">
            {parts.length ? (
              <div className="space-y-1">
                <label htmlFor="supplier-part" className="text-xs font-medium">Spare part</label>
                <select id="supplier-part" className={fieldClass} value={partName} onChange={(e) => setSelectedPart(e.target.value)} aria-label="Choose a spare part to compare">
                  {parts.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            ) : hub.hubQ.isLoading ? <SkeletonRows rows={1} /> : <p className="text-sm text-muted-foreground">Part choices will appear when inventory is available.</p>}

            <fieldset className="rounded-lg border p-3" aria-label="Supplier catalog feeds">
              <legend className="px-1 text-xs font-medium">Live supplier feeds</legend>
              {catalogQuery.isFetching && <span role="status" className="mb-2 inline-flex items-center gap-1 text-xs text-busy"><RefreshCw className="animate-spin" size={12} /> Checking prices</span>}
              {providersQuery.isLoading && <SkeletonRows rows={1} label="Loading supplier feeds" />}
              {providersQuery.isError && <InlineError onRetry={() => void providersQuery.refetch()} retrying={providersQuery.isFetching}>Supported supplier feeds could not be loaded.</InlineError>}
              {!providersQuery.isLoading && !providersQuery.isError && !providersQuery.data?.providers.length && <p className="text-xs text-muted-foreground">No live feeds are configured. Captured offers are still available below.</p>}
              {!!providersQuery.data?.providers.length && (
                <div className="flex flex-wrap gap-2">
                  {providersQuery.data.providers.map((p) => (
                    <label key={p.id} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:border-primary/50 has-[:checked]:bg-accent">
                      <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={selectedSupplierIds.includes(p.id)} onChange={() => toggleSupplier(p.id)} />{p.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            {reorderStockLine && (
              <div className="rounded-lg border border-pending/30 bg-pending/[0.06] p-3">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="min-w-0 text-sm">
                    <div className="flex items-center gap-2"><StatusBadge tone="pending">Draft</StatusBadge><strong>Van {reorderStockLine.van_id} · {reorderStockLine.part_name}</strong></div>
                    <p className="mt-1 text-xs text-muted-foreground"><Mono>{reorderStockLine.quantity}</Mono> on hand · choose an offer to save a separate reorder draft.</p>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="reorder-qty" className="text-xs font-medium">Quantity to request</label>
                    <input id="reorder-qty" type="number" inputMode="numeric" min="1" max="10000" step="1" className={cn(fieldClass, 'w-32 font-mono')}
                      value={qtyValue} aria-label="Reorder quantity" aria-invalid={!!qtyError} aria-describedby={qtyError ? 'reorder-qty-error' : undefined}
                      onChange={(e) => { setReorderQuantity(e.target.value); setQtyError(''); }} />
                  </div>
                </div>
                {qtyError && <p id="reorder-qty-error" className="mt-1 text-right text-xs text-err">{qtyError}</p>}
                {!partMatches && <p className="mt-2 text-xs text-pending">Select {reorderStockLine.part_name} to use this stock line.</p>}
              </div>
            )}
            {reorderError && <InlineError>{reorderError}</InlineError>}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <h3 className="truncate text-lg font-semibold">{partName || 'Supplier offers'}</h3>
                <p className="text-xs text-muted-foreground">{sortMode === 'quality' ? 'Rated quality first, then effective price' : 'Lowest effective price first'} · MYR</p>
              </div>
              <OfferSortChips label="Sort offers" value={sortMode} onChange={setSortMode} options={[{ value: 'quality', label: 'Best quality' }, { value: 'price', label: 'Lowest price' }]} />
            </div>
            <OfferFilterChips label="Filter offers" value={avail} onChange={setAvail} options={[{ value: 'all', label: 'All' }, { value: 'available', label: 'Orderable' }, { value: 'captured', label: 'Captured' }, { value: 'live', label: 'Live feed' }]} />

            {loading && <SkeletonRows rows={3} label="Loading supplier offers" />}
            {quotesQuery.isError && <InlineError onRetry={() => void quotesQuery.refetch()} retrying={quotesQuery.isFetching}>Captured supplier offers could not be loaded.</InlineError>}
            {catalogQuery.isError && <InlineError onRetry={() => void catalogQuery.refetch()} retrying={catalogQuery.isFetching}>Live catalog results could not be loaded. Saved manual quotes are still available.</InlineError>}
            {suppliersWithErrors.map((s) => <InlineError key={s.id}><strong>{s.name} feed failed:</strong> {s.error || 'The supplier feed could not be reached.'}</InlineError>)}
            {!loading && !quotesQuery.isError && !filtered.length && <EmptyState icon={<ShoppingBag size={16} />} title="No offers found">Add a captured listing, change the filter or try another part.</EmptyState>}

            {!!shown.length && (
              <div className="space-y-3">
                {shown.map((o) => {
                  const best = o.id === bestId;
                  const checked = new Date(o.checkedAt);
                  return (
                    <article key={o.id} className={cn('rounded-xl border p-4 transition-colors', best && 'border-ok/40 bg-ok/[0.04]', o.stale && 'border-dashed')}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 font-medium">{o.supplierName}
                            {best && <StatusBadge tone="ok"><BadgeCheck size={11} /> {sortMode === 'quality' ? 'Top rated' : 'Lowest price'}</StatusBadge>}
                            <StatusBadge tone="idle">{o.sourceType === 'live_catalog' ? 'Live feed' : 'Captured'}</StatusBadge>
                          </div>
                          <a className="mt-0.5 inline-flex items-center gap-1 break-words text-sm text-primary hover:underline" href={o.productUrl} target="_blank" rel="noopener noreferrer">{o.productName} <ArrowUpRight size={12} /></a>
                          {o.partNumber && <Mono className="block text-xs text-muted-foreground">SKU {o.partNumber}</Mono>}
                        </div>
                        <div className="sm:text-right">
                          <Mono className="block text-xl font-semibold">{ringgit.format(o.priceMyr)}</Mono>
                          <span className="text-[11px] text-muted-foreground">effective / unit{o.sourceType === 'live_catalog' ? ' · shipping unknown' : o.shippingMyr == null ? ' · shipping excluded' : ''}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {o.qualityRating != null && (
                          <span className="inline-flex items-center gap-0.5 text-pending" aria-label={`Quality rating ${o.qualityRating} out of 5`}>
                            {Array.from({ length: 5 }, (_, s) => <Star key={s} size={12} fill={s < o.qualityRating! ? 'currentColor' : 'none'} />)}
                            <b className="ml-1 font-mono text-foreground">{o.qualityRating}/5</b><span className="ml-1">team rated</span>
                          </span>
                        )}
                        <span><Mono>{ringgit.format(o.packPrice)}</Mono> / pack · {o.unitLabel || (o.packageQuantity == null ? 'unit size not reported' : `${o.packageQuantity} per pack`)}</span>
                        {o.sourceType === 'captured_quote' && <span>Min {o.minimumOrderPacks ?? 1} pack{(o.minimumOrderPacks ?? 1) === 1 ? '' : 's'}{o.shippingMyr != null ? ` · ${ringgit.format(o.shippingMyr)} shipping` : ''}</span>}
                      </div>
                      {o.qualityEvidence && <p className="mt-2 text-xs"><strong>Quality evidence:</strong> {o.qualityEvidence}</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <StatusBadge tone={availTone(o.availabilityNote)}>{o.availabilityNote}</StatusBadge>
                        {o.stale && <StatusBadge tone="pending">Stale price</StatusBadge>}
                        <time dateTime={Number.isNaN(checked.getTime()) ? undefined : checked.toISOString()}>{o.sourceType === 'live_catalog' ? 'Feed checked' : 'Captured'} <Mono>{Number.isNaN(checked.getTime()) ? o.checkedAt : checked.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</Mono></time>
                        {o.sourceUpdatedAt && <span>Supplier update <Mono>{new Date(o.sourceUpdatedAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}</Mono></span>}
                      </div>
                      {reorderStockLine && (
                        <Button type="button" size="sm" variant="outline" className="mt-3"
                          disabled={draftingId !== null || hub.writePending || o.availabilityNote === 'Out of stock' || !partMatches}
                          onClick={() => void createDraft(o)}>
                          <PackagePlus size={13} /> {draftingId === o.id ? 'Saving draft…' : o.availabilityNote === 'Out of stock' ? 'Unavailable' : 'Create reorder draft'}
                        </Button>
                      )}
                    </article>
                  );
                })}
                {filtered.length > PAGE && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Mono>{cur * PAGE + 1}–{Math.min(filtered.length, (cur + 1) * PAGE)} of {filtered.length}</Mono>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Previous</Button>
                      <Button size="sm" variant="outline" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next</Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card title={<><Plus size={15} /> Add a store offer</>} className="self-start">
          <form noValidate onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="quote-supplierName" label="Store / supplier" error={errors.supplierName}><input {...inputProps('supplierName')} maxLength={120} placeholder="e.g. Local parts shop" /></Field>
              <Field id="quote-productName" label="Product name" error={errors.productName}><input {...inputProps('productName')} maxLength={200} placeholder="Brand and model" /></Field>
              <Field id="quote-priceMyr" label="Store price (MYR / pack)" error={errors.priceMyr}><input {...inputProps('priceMyr')} className={cn(fieldClass, 'font-mono')} type="number" inputMode="decimal" min="0.01" step="0.01" placeholder="0.00" /></Field>
              <Field id="quote-productUrl" label="Product page URL" error={errors.productUrl}><input {...inputProps('productUrl')} type="url" maxLength={2048} placeholder="https://" /></Field>
              <Field id="quote-availabilityNote" label="Store availability" error={errors.availabilityNote}>
                <select {...inputProps('availabilityNote')}><option>Not checked</option><option>In stock</option><option>Limited stock</option><option>Out of stock</option></select>
              </Field>
              <Field id="quote-qualityRating" label="Quality rating from evidence" error={errors.qualityRating}>
                <select {...inputProps('qualityRating')}>
                  <option value="">Choose a score</option><option value="1">1 · Poor</option><option value="2">2 · Below average</option>
                  <option value="3">3 · Meets requirements</option><option value="4">4 · Good</option><option value="5">5 · Excellent</option>
                </select>
              </Field>
              <Field id="quote-packageQuantity" label="Pack quantity" error={errors.packageQuantity}><input {...inputProps('packageQuantity')} className={cn(fieldClass, 'font-mono')} type="number" inputMode="numeric" min="1" step="1" /></Field>
              <Field id="quote-minimumOrderPacks" label="Minimum order (packs)" error={errors.minimumOrderPacks}><input {...inputProps('minimumOrderPacks')} className={cn(fieldClass, 'font-mono')} type="number" inputMode="numeric" min="1" step="1" /></Field>
              <Field id="quote-shippingMyr" label="Shipping cost (MYR)" error={errors.shippingMyr} hint="Leave blank if unknown"><input {...inputProps('shippingMyr')} className={cn(fieldClass, 'font-mono')} type="number" inputMode="decimal" min="0" step="0.01" /></Field>
              <Field id="quote-partNumber" label={<>Part / store SKU <span className="text-muted-foreground">optional</span></>} error={errors.partNumber}><input {...inputProps('partNumber')} className={cn(fieldClass, 'font-mono')} maxLength={120} placeholder="Exact item reference" /></Field>
              <Field id="quote-qualityEvidence" wide label="Quality evidence" error={errors.qualityEvidence}>
                <textarea {...inputProps('qualityEvidence')} className={cn(fieldClass, 'min-h-24')} maxLength={400} placeholder="What supports the score? Datasheet, warranty, independent review or inspection notes." />
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">The score is entered by your team and is not independently verified. Unit cost includes the pack minimum and known shipping.</p>
            <Button type="submit" className="w-full sm:w-auto" disabled={saveQuote.isPending || !parts.length}>
              {saveQuote.isPending ? <><Loader2 className="animate-spin" size={14} /> Saving offer…</> : <><Plus size={14} /> Save offer for {partName || 'part'}</>}
            </Button>
            {saveQuote.isError && <InlineError>The supplier offer was not saved. Check the listing details and try again.</InlineError>}
          </form>
        </Card>
      </div>
    </div>
  );
}
