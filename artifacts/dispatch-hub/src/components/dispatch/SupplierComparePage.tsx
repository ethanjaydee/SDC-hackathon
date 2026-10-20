import { useMemo, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowDownWideNarrow, ArrowUpRight, BadgeCheck, LoaderCircle, Plus, ShoppingBag, Star } from 'lucide-react';
import {
  getListSupplierQuotesQueryKey,
  useListSupplierQuotes,
  useSaveSupplierQuote,
  type SupplierQuoteInput,
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

function unitPrice(offer: SupplierQuoteInput | { price_myr: number; package_quantity?: number | null; minimum_order_packs?: number | null; shipping_myr?: number | null }) {
  const units = (offer.package_quantity ?? 1) * (offer.minimum_order_packs ?? 1);
  return (offer.price_myr * (offer.minimum_order_packs ?? 1) + (offer.shipping_myr ?? 0)) / units;
}

export default function SupplierComparePage({ hub }: Hub) {
  const parts = useMemo(() => [...new Set(hub.inventory.map((item) => item.part_name))].sort(), [hub.inventory]);
  const [selectedPart, setSelectedPart] = useState('');
  const [sortMode, setSortMode] = useState<'quality' | 'price'>('quality');
  const [form, setForm] = useState<OfferForm>(emptyForm);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const partName = selectedPart || parts[0] || '';
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
  const saveQuote = useSaveSupplierQuote();
  const offers = useMemo(() => {
    const result = [...(quotesQuery.data?.quotes ?? [])];
    result.sort((a, b) => sortMode === 'price'
      ? unitPrice(a) - unitPrice(b) || b.quality_rating - a.quality_rating
      : b.quality_rating - a.quality_rating || unitPrice(a) - unitPrice(b));
    return result;
  }, [quotesQuery.data, sortMode]);
  const setField = (key: keyof OfferForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

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
        <span><strong>Manually captured offers.</strong> This demo does not fetch live store prices. Enter prices and ratings from a supplier listing or your own documented inspection; verify them before ordering.</span>
      </div>

      <div className="af-supplier-layout">
        <Card title="Part comparison" aside={<span className="af-mono" style={{ color: '#89867f' }}>{offers.length} saved offers</span>}>
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

          <div className="af-supplier-results">
            <div className="af-supplier-results-head">
              <div>
                <h2>{partName || 'Supplier offers'}</h2>
                <p>Quality first, then effective price · MYR</p>
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

            {quotesQuery.isLoading && <div className="af-supplier-state" role="status"><LoaderCircle className="af-spin" size={15} /> Loading saved offers…</div>}
            {quotesQuery.isError && <div className="af-error" role="alert">Supplier offers could not be loaded. Try changing the part or reload this page.</div>}
            {!quotesQuery.isLoading && !quotesQuery.isError && !offers.length && (
              <div className="af-empty-log">No offers saved for this part yet. Add a supplier listing to start comparing.</div>
            )}
            {!!offers.length && (
              <div className="af-offer-list">
                {offers.map((offer, index) => {
                  const price = unitPrice(offer);
                  const hasShipping = offer.shipping_myr != null;
                  const best = sortMode === 'quality' ? index === 0 : price === unitPrice(offers[0]);
                  return (
                    <article className={`af-offer ${best ? 'best' : ''}`} key={offer.id}>
                      <div className="af-offer-top">
                        <div>
                          <div className="af-offer-supplier">{offer.supplier_name}{best && <span className="af-best-tag"><BadgeCheck size={11} /> {sortMode === 'quality' ? 'Top rated' : 'Lowest price'}</span>}</div>
                          <a className="af-offer-product" href={offer.product_url} target="_blank" rel="noopener noreferrer">
                            {offer.product_name} <ArrowUpRight size={12} />
                          </a>
                          {offer.part_number && <span className="af-offer-sku">SKU · {offer.part_number}</span>}
                        </div>
                        <div className="af-offer-price">
                          <strong>{ringgit.format(price)}</strong>
                          <span>effective / unit{!hasShipping ? ' · shipping excluded' : ''}</span>
                        </div>
                      </div>
                      <div className="af-offer-meta">
                        <span className="af-quality-score" aria-label={`Quality rating ${offer.quality_rating} out of 5`}>
                          {Array.from({ length: 5 }, (_, star) => <Star key={star} size={13} fill={star < offer.quality_rating ? 'currentColor' : 'none'} />)}
                          <b>{offer.quality_rating}/5</b>
                        </span>
                        <span>{ringgit.format(offer.price_myr)} / pack · {offer.package_quantity ?? 1} per pack</span>
                        <span>Min {offer.minimum_order_packs ?? 1} pack{(offer.minimum_order_packs ?? 1) === 1 ? '' : 's'}{hasShipping ? ` · ${ringgit.format(offer.shipping_myr!)} shipping` : ''}</span>
                      </div>
                      <p className="af-offer-evidence"><strong>Quality evidence:</strong> {offer.quality_evidence_note}</p>
                      <div className="af-offer-foot">
                        <span className={`af-availability ${offer.availability_note === 'In stock' ? 'available' : offer.availability_note === 'Out of stock' ? 'unavailable' : ''}`}>{offer.availability_note}</span>
                        <time dateTime={new Date(offer.checked_at).toISOString()}>Checked {new Date(offer.checked_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}</time>
                      </div>
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
