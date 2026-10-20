import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { ArrowDownWideNarrow, ArrowUpRight, BadgeCheck, LoaderCircle, PackagePlus, Plus, RefreshCw, ShoppingBag, Star } from 'lucide-react';
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
  type SupplierCatalogOffer,
  type SupplierOffer,
  type SupplierQuoteInput,
  type ReorderDraftInput,
} from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Card, PageHead, type Hub } from './shared';

type OfferForm = {
  partNumber: string;
  productName: string;
  supplierName: string;
  productUrl: string;
  priceMyr: string;
  availabilityNote: string;
  packageQuantity: string;
  minimumOrderPacks: string;
  shippingMyr: string;
  qualityRating: string;
  qualityEvidence: string;
};

const emptyForm: OfferForm = {
  partNumber: '',
  productName: '',
  supplierName: '',
  productUrl: '',
  priceMyr: '',
  availabilityNote: 'Not checked',
  packageQuantity: '1',
  minimumOrderPacks: '1',
  shippingMyr: '',
  qualityRating: '',
  qualityEvidence: '',
};

const ringgit = new Intl.NumberFormat('en-MY', { style: 'currency', currency: 'MYR' });
const staleAfterMs = 24 * 60 * 60 * 1000;

type ComparisonOffer = {
  id: string;
  sourceType: 'captured_quote' | 'live_catalog';
  supplierName: string;
  productName: string;
  productUrl: string;
  priceMyr: number;
  packPrice: number;
  packageQuantity: number | null;
  unitLabel: string | null;
  minimumOrderPacks: number | null;
  shippingMyr: number | null;
  availabilityNote: string;
  checkedAt: string;
  sourceUpdatedAt: string | null;
  stale: boolean;
  qualityRating: number | null;
  qualityEvidence: string | null;
  partNumber: string | null;
};

function unitPrice(offer: { price_myr: number; package_quantity?: number | null; minimum_order_packs?: number | null; shipping_myr?: number | null }) {
  const units = (offer.package_quantity ?? 1) * (offer.minimum_order_packs ?? 1);
  return (offer.price_myr * (offer.minimum_order_packs ?? 1) + (offer.shipping_myr ?? 0)) / units;
}

export default function SupplierComparePage({ hub }: Hub) {
  const parts = useMemo(() => [...new Set(hub.inventory.map((item) => item.part_name))].sort(), [hub.inventory]);
  const requestedInventoryId = Number(new URLSearchParams(window.location.search).get('inventory_id'));
  const reorderStockLine = Number.isSafeInteger(requestedInventoryId) && requestedInventoryId > 0
    ? hub.inventory.find((item) => item.id === requestedInventoryId)
    : undefined;
  const [selectedPart, setSelectedPart] = useState(() => new URLSearchParams(window.location.search).get('part') || '');
  const [reorderQuantity, setReorderQuantity] = useState('');
  const [reorderError, setReorderError] = useState('');
  const [sortMode, setSortMode] = useState<'quality' | 'price'>('quality');
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const [selectedSupplierIds, setSelectedSupplierIds] = useState<string[]>([]);
  const supplierSelectionInitialized = useRef(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const partName = selectedPart || reorderStockLine?.part_name || parts[0] || '';
  const providersQuery = useListSupplierCatalogProviders({
    query: {
      queryKey: getListSupplierCatalogProvidersQueryKey(),
      staleTime: 60_000,
    },
  });
  useEffect(() => {
    const providers = providersQuery.data?.providers;
    if (!providers || supplierSelectionInitialized.current) return;
    supplierSelectionInitialized.current = true;
    const availableIds = providers.map((provider) => provider.id);
    let savedIds: string[] = [];
    let hasSavedSelection = false;
    try {
      const stored = window.localStorage.getItem('dispatch-selected-supplier-feeds');
      if (stored != null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          savedIds = parsed.filter((id): id is string => typeof id === 'string');
          hasSavedSelection = true;
        }
      }
    } catch {
      savedIds = [];
    }
    setSelectedSupplierIds(hasSavedSelection
      ? savedIds.filter((id) => availableIds.includes(id))
      : availableIds);
  }, [providersQuery.data]);
  const quotesQuery = useListSupplierQuotes(
    { query: partName },
    {
      query: {
        queryKey: getListSupplierQuotesQueryKey({ query: partName }),
        enabled: partName.trim().length >= 2,
        refetchOnWindowFocus: true,
      },
    },
  );
  const catalogQuery = useSearchSupplierCatalog(
    { query: partName, supplier_ids: selectedSupplierIds },
    {
      query: {
        queryKey: getSearchSupplierCatalogQueryKey({ query: partName, supplier_ids: selectedSupplierIds }),
        enabled: partName.trim().length >= 2 && selectedSupplierIds.length > 0,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
      },
    },
  );
  const saveQuote = useSaveSupplierQuote();
  const createReorder = useCreateReorderDraft();
  useEffect(() => {
    if (reorderStockLine && !selectedPart) setSelectedPart(reorderStockLine.part_name);
  }, [reorderStockLine, selectedPart]);
  const offers = useMemo(() => {
    const captured: ComparisonOffer[] = (quotesQuery.data?.quotes ?? []).map((offer) => ({
      id: `quote-${offer.id}`,
      sourceType: 'captured_quote',
      supplierName: offer.supplier_name,
      productName: offer.product_name,
      productUrl: offer.product_url,
      priceMyr: unitPrice(offer),
      packPrice: offer.price_myr,
      packageQuantity: offer.package_quantity,
      unitLabel: null,
      minimumOrderPacks: offer.minimum_order_packs,
      shippingMyr: offer.shipping_myr,
      availabilityNote: offer.availability_note,
      checkedAt: offer.checked_at,
      sourceUpdatedAt: null,
      stale: Date.now() - new Date(offer.checked_at).getTime() > staleAfterMs,
      qualityRating: offer.quality_rating,
      qualityEvidence: offer.quality_evidence_note,
      partNumber: offer.part_number,
    }));
    const live: ComparisonOffer[] = (catalogQuery.data?.suppliers ?? [])
      .flatMap((supplier) => supplier.offers)
      .map((offer) => ({
        id: `live-${offer.id}`,
        sourceType: 'live_catalog',
        supplierName: offer.supplier_name,
        productName: offer.product_name,
        productUrl: offer.product_url,
        priceMyr: unitPrice(offer),
        packPrice: offer.price_myr,
        packageQuantity: offer.package_quantity,
        unitLabel: offer.unit_label,
        minimumOrderPacks: null,
        shippingMyr: null,
        availabilityNote: offer.availability_note,
        checkedAt: offer.checked_at,
        sourceUpdatedAt: offer.source_updated_at,
        stale: offer.is_stale,
        qualityRating: null,
        qualityEvidence: null,
        partNumber: null,
      }));
    const result = [...captured, ...live];
    result.sort((a, b) => sortMode === 'price'
      ? a.priceMyr - b.priceMyr || (b.qualityRating ?? 0) - (a.qualityRating ?? 0)
      : (b.qualityRating ?? 0) - (a.qualityRating ?? 0) || a.priceMyr - b.priceMyr);
    return result;
  }, [catalogQuery.data, quotesQuery.data, sortMode]);
  const suppliersWithErrors = (catalogQuery.data?.suppliers ?? []).filter((supplier) => supplier.status === 'error');
  const toggleSupplier = (supplierId: string) => {
    setSelectedSupplierIds((current) => {
      const next = current.includes(supplierId)
        ? current.filter((id) => id !== supplierId)
        : [...current, supplierId];
      window.localStorage.setItem('dispatch-selected-supplier-feeds', JSON.stringify(next));
      return next;
    });
  };
  const setField = (key: keyof OfferForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const createDraft = async (offer: ComparisonOffer) => {
    if (!reorderStockLine || partName.toLowerCase() !== reorderStockLine.part_name.toLowerCase()) return;
    setReorderError('');
    const input: ReorderDraftInput = {
      inventory_id: reorderStockLine.id,
      part_name: partName,
      source_type: offer.sourceType,
      source_offer_id: offer.id,
      supplier_name: offer.supplierName,
      product_name: offer.productName,
      product_url: offer.productUrl,
      unit_price_myr: offer.priceMyr,
      pack_price_myr: offer.packPrice,
      package_quantity: offer.packageQuantity,
      minimum_order_packs: offer.minimumOrderPacks,
      shipping_myr: offer.shippingMyr,
      availability_note: offer.availabilityNote as ReorderDraftInput['availability_note'],
      offer_checked_at: offer.checkedAt,
      offer_stale: offer.stale,
      requested_quantity: Number(reorderQuantity || Math.max(1, 5 - reorderStockLine.quantity)),
    };
    try {
      await createReorder.mutateAsync({ data: input });
      await queryClient.invalidateQueries({ queryKey: getListReorderDraftsQueryKey() });
      toast({
        title: 'Reorder draft saved',
        description: `${input.requested_quantity} × ${reorderStockLine.part_name} from ${offer.supplierName}. Van stock is unchanged.`,
      });
      navigate('/reorders');
    } catch (error) {
      const detail = error as { data?: { error?: string }; message?: string };
      setReorderError(detail?.data?.error || detail?.message || 'The reorder draft could not be saved.');
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!partName) return;
    const input: SupplierQuoteInput = {
      search_term: partName,
      part_name: partName,
      part_number: form.partNumber.trim() || null,
      product_name: form.productName.trim(),
      supplier_name: form.supplierName.trim(),
      product_url: form.productUrl.trim(),
      price_myr: Number(form.priceMyr),
      availability_note: form.availabilityNote as SupplierQuoteInput['availability_note'],
      package_quantity: Number(form.packageQuantity) || 1,
      minimum_order_packs: Number(form.minimumOrderPacks) || 1,
      shipping_myr: form.shippingMyr.trim() === '' ? null : Number(form.shippingMyr),
      quality_rating: Number(form.qualityRating),
      quality_evidence_note: form.qualityEvidence.trim(),
    };
    try {
      await saveQuote.mutateAsync({ data: input });
      await queryClient.invalidateQueries({ queryKey: getListSupplierQuotesQueryKey({ query: partName }) });
      setForm(emptyForm);
      toast({ title: 'Supplier offer saved', description: `Added ${input.supplier_name} to the ${partName} comparison.` });
    } catch (error) {
      const detail = error as { data?: { error?: string }; message?: string };
      toast({
        title: 'Could not save supplier offer',
        description: detail?.data?.error || detail?.message || 'Check the details and try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="af-page">
      <PageHead
        kicker="Purchasing"
        title="Compare store offers"
        sub="Compare the same spare part across suppliers using captured price and quality evidence."
      />

      <div className="af-note af-supplier-disclaimer">
        <ShoppingBag size={14} />
        <span><strong>Live feeds and captured offers.</strong> Catalog prices are fetched from configured supplier feeds every five minutes. Confirm current price and stock with the supplier before ordering.</span>
      </div>

      <div className="af-supplier-layout">
        <Card title="Part comparison" aside={<span className="af-mono" style={{ color: '#89867f' }}>{offers.length} offers</span>}>
          {parts.length ? (
            <label className="af-supplier-part">
              <span className="af-label">Spare part</span>
              <select
                className="af-select"
                value={partName}
                onChange={(event) => setSelectedPart(event.target.value)}
                aria-label="Choose a spare part to compare"
              >
                {parts.map((part) => <option key={part} value={part}>{part}</option>)}
              </select>
            </label>
          ) : <p className="af-hint">Part choices will appear when inventory is available.</p>}

          <div className="af-supplier-feed-picker" aria-label="Supplier catalog feeds">
            <div className="af-supplier-feed-heading">
              <strong>Live supplier feeds</strong>
              {catalogQuery.isFetching && <span role="status"><RefreshCw className="af-spin" size={12} /> Checking prices</span>}
            </div>
            {providersQuery.isLoading && <p className="af-hint">Loading supported supplier feeds…</p>}
            {providersQuery.isError && <p className="af-error" role="alert">Supported supplier feeds could not be loaded.</p>}
            {!providersQuery.isLoading && !providersQuery.isError && !providersQuery.data?.providers.length && (
              <p className="af-hint">No live feeds are configured. Manually captured supplier offers are still available below.</p>
            )}
            {!!providersQuery.data?.providers.length && (
              <div className="af-supplier-feed-options">
                {providersQuery.data.providers.map((provider) => (
                  <label key={provider.id}>
                    <input
                      type="checkbox"
                      checked={selectedSupplierIds.includes(provider.id)}
                      onChange={() => toggleSupplier(provider.id)}
                    />
                    <span>{provider.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="af-supplier-results">
            {reorderStockLine && (
              <div className="af-reorder-context">
                <div>
                  <strong>Draft for Van {reorderStockLine.van_id} · {reorderStockLine.part_name}</strong>
                  <span>{reorderStockLine.quantity} on hand · choose an offer to save a separate reorder draft.</span>
                </div>
                <label>
                  <span>Quantity to request</span>
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={reorderQuantity || Math.max(1, 5 - reorderStockLine.quantity)}
                    onChange={(event) => setReorderQuantity(event.target.value)}
                    aria-label="Reorder quantity"
                  />
                </label>
                {partName.toLowerCase() !== reorderStockLine.part_name.toLowerCase() && (
                  <p className="af-hint af-reorder-match-hint">Select {reorderStockLine.part_name} to use this stock line.</p>
                )}
              </div>
            )}
            {reorderError && <p className="af-error" role="alert">{reorderError}</p>}
            <div className="af-supplier-results-head">
              <div>
                <h2>{partName || 'Supplier offers'}</h2>
                <p>{sortMode === 'quality' ? 'Captured quality ratings first, then effective price' : 'Lowest effective price first'} · MYR</p>
              </div>
              <label className="af-sort-control">
                <ArrowDownWideNarrow size={13} />
                <span className="af-sr-only">Sort offers</span>
                <select value={sortMode} onChange={(event) => setSortMode(event.target.value as 'quality' | 'price')} aria-label="Sort supplier offers">
                  <option value="quality">Best quality</option>
                  <option value="price">Lowest price</option>
                </select>
              </label>
            </div>

            {(quotesQuery.isLoading || (selectedSupplierIds.length > 0 && catalogQuery.isLoading)) && <div className="af-supplier-state" role="status"><LoaderCircle className="af-spin" size={15} /> Loading supplier offers…</div>}
            {quotesQuery.isError && <div className="af-error" role="alert">Supplier offers could not be loaded. Try changing the part or reload this page.</div>}
            {catalogQuery.isError && <div className="af-error af-supplier-feed-error" role="alert">Live catalog results could not be loaded. Saved manual quotes are still available.</div>}
            {suppliersWithErrors.map((supplier) => (
              <div className="af-error af-supplier-feed-error" role="alert" key={supplier.id}>
                <strong>{supplier.name} feed failed:</strong> {supplier.error || 'The supplier feed could not be reached.'}
              </div>
            ))}
            {!quotesQuery.isLoading && !quotesQuery.isError && !catalogQuery.isLoading && !offers.length && (
              <div className="af-empty-log">No offers found for this part. Add a captured listing or try another part.</div>
            )}
            {!!offers.length && (
              <div className="af-offer-list">
                {offers.map((offer, index) => {
                  const best = sortMode === 'quality'
                    ? offer.qualityRating != null && offer.qualityRating === offers.find((item) => item.qualityRating != null)?.qualityRating &&
                      offers.findIndex((item) => item.qualityRating != null) === index
                    : offer.priceMyr === offers[0].priceMyr;
                  const checkedAt = new Date(offer.checkedAt);
                  return (
                    <article className={`af-offer ${best ? 'best' : ''} ${offer.stale ? 'stale' : ''}`} key={offer.id}>
                      <div className="af-offer-top">
                        <div>
                          <div className="af-offer-supplier">{offer.supplierName}{best && <span className="af-best-tag"><BadgeCheck size={11} /> {sortMode === 'quality' ? 'Top rated' : 'Lowest price'}</span>}</div>
                          <a className="af-offer-product" href={offer.productUrl} target="_blank" rel="noopener noreferrer">
                            {offer.productName} <ArrowUpRight size={12} />
                          </a>
                          {offer.partNumber && <span className="af-offer-sku">SKU · {offer.partNumber}</span>}
                        </div>
                        <div className="af-offer-price">
                          <strong>{ringgit.format(offer.priceMyr)}</strong>
                          <span>effective / unit{offer.sourceType === 'live_catalog' ? ' · shipping unknown' : offer.shippingMyr == null ? ' · shipping excluded' : ''}</span>
                        </div>
                      </div>
                      <div className="af-offer-meta">
                        {offer.qualityRating != null && (
                          <span className="af-quality-score" aria-label={`Quality rating ${offer.qualityRating} out of 5`}>
                            {Array.from({ length: 5 }, (_, star) => <Star key={star} size={13} fill={star < offer.qualityRating! ? 'currentColor' : 'none'} />)}
                            <b>{offer.qualityRating}/5 · team rated</b>
                          </span>
                        )}
                        <span>{ringgit.format(offer.packPrice)} / pack · {offer.unitLabel || (offer.packageQuantity == null ? 'unit size not reported' : `${offer.packageQuantity} per pack`)}</span>
                        {offer.sourceType === 'captured_quote' && (
                          <span>Min {offer.minimumOrderPacks ?? 1} pack{(offer.minimumOrderPacks ?? 1) === 1 ? '' : 's'}{offer.shippingMyr != null ? ` · ${ringgit.format(offer.shippingMyr)} shipping` : ''}</span>
                        )}
                      </div>
                      {offer.qualityEvidence && <p className="af-offer-evidence"><strong>Quality evidence:</strong> {offer.qualityEvidence}</p>}
                      <div className="af-offer-foot">
                        <span className={`af-availability ${offer.availabilityNote === 'In stock' ? 'available' : offer.availabilityNote === 'Out of stock' ? 'unavailable' : ''}`}>{offer.availabilityNote}</span>
                        {offer.stale && <span className="af-stale-tag" role="status">Stale price</span>}
                        <time dateTime={checkedAt.toISOString()}>
                          {offer.sourceType === 'live_catalog' ? 'Feed checked' : 'Quote captured'} {checkedAt.toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </time>
                        {offer.sourceUpdatedAt && <span>Supplier update: {new Date(offer.sourceUpdatedAt).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                      </div>
                      {reorderStockLine && (
                        <button
                          className="af-reorder-offer-btn"
                          type="button"
                          disabled={createReorder.isPending || offer.availabilityNote === 'Out of stock' || partName.toLowerCase() !== reorderStockLine.part_name.toLowerCase()}
                          onClick={() => void createDraft(offer)}
                        >
                          <PackagePlus size={13} />
                          {createReorder.isPending ? 'Saving draft…' : offer.availabilityNote === 'Out of stock' ? 'Unavailable' : 'Create reorder draft'}
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </Card>

        <Card title={<><Plus size={15} /> Add a store offer</>}>
          <form className="af-supplier-form" onSubmit={submit}>
            <div className="af-supplier-fields">
              <label><span>Store / supplier</span><input required minLength={2} maxLength={120} value={form.supplierName} onChange={(e) => setField('supplierName', e.target.value)} placeholder="e.g. Local parts shop" /></label>
              <label><span>Product name</span><input required minLength={2} maxLength={200} value={form.productName} onChange={(e) => setField('productName', e.target.value)} placeholder="Brand and model" /></label>
              <label><span>Store price (MYR / pack)</span><input required type="number" min="0.01" max="1000000" step="0.01" value={form.priceMyr} onChange={(e) => setField('priceMyr', e.target.value)} placeholder="0.00" /></label>
              <label><span>Product page URL</span><input required type="url" maxLength={2048} value={form.productUrl} onChange={(e) => setField('productUrl', e.target.value)} placeholder="https://…" /></label>
              <label><span>Store availability</span>
                <select className="af-select" value={form.availabilityNote} onChange={(e) => setField('availabilityNote', e.target.value)}>
                  <option>Not checked</option><option>In stock</option><option>Limited stock</option><option>Out of stock</option>
                </select>
              </label>
              <label><span>Quality rating from evidence</span>
                <select required className="af-select" value={form.qualityRating} onChange={(e) => setField('qualityRating', e.target.value)}>
                  <option value="">Choose a score</option>
                  <option value="1">1 — Poor</option><option value="2">2 — Below average</option>
                  <option value="3">3 — Meets requirements</option><option value="4">4 — Good</option>
                  <option value="5">5 — Excellent</option>
                </select>
              </label>
              <label><span>Pack quantity</span><input required type="number" min="1" max="100000" step="1" value={form.packageQuantity} onChange={(e) => setField('packageQuantity', e.target.value)} /></label>
              <label><span>Minimum order (packs)</span><input required type="number" min="1" max="100000" step="1" value={form.minimumOrderPacks} onChange={(e) => setField('minimumOrderPacks', e.target.value)} /></label>
              <label><span>Shipping cost (MYR)</span><input type="number" min="0" max="1000000" step="0.01" value={form.shippingMyr} onChange={(e) => setField('shippingMyr', e.target.value)} placeholder="Leave blank if unknown" /></label>
              <label><span>Part / store SKU <em>optional</em></span><input maxLength={120} value={form.partNumber} onChange={(e) => setField('partNumber', e.target.value)} placeholder="Exact item reference" /></label>
              <label className="af-supplier-wide"><span>Quality evidence <em>required</em></span><textarea required minLength={5} maxLength={400} value={form.qualityEvidence} onChange={(e) => setField('qualityEvidence', e.target.value)} placeholder="What supports the score? e.g. datasheet, warranty, independent review, or inspection notes." /></label>
            </div>
            <p className="af-hint">The score is entered by your team and is not independently verified. A lower unit cost includes the pack minimum and known shipping; unknown shipping is excluded.</p>
            <button className="af-primary" type="submit" disabled={saveQuote.isPending || !parts.length}>
              {saveQuote.isPending ? <><LoaderCircle className="af-spin" size={14} /> Saving offer…</> : <><Plus size={14} /> Save offer for {partName || 'part'}</>}
            </button>
            {saveQuote.isError && <p className="af-error" role="alert">The supplier offer was not saved. Check the listing details and try again.</p>}
          </form>
        </Card>
      </div>
    </div>
  );
}
