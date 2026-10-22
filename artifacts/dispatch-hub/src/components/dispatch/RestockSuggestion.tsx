import { Boxes, ShoppingCart } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MONTHS, getInventoryRestockSuggestion, type StockLine } from './workshopAnalytics';

export function RestockSuggestion({ item, inventory, year, month, stale }: {
  item: StockLine; inventory: readonly StockLine[]; year: number; month: number; stale: boolean;
}) {
  const plan = getInventoryRestockSuggestion(item.part_name, year, month, item.van_id, inventory);
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline" data-testid={`restock-${item.van_id}-${item.part_name}`}>
          <ShoppingCart size={13} /> Restock · {plan.suggestedBuy == null ? 'Unknown' : `Buy ${plan.suggestedBuy}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Restock {item.part_name}</DialogTitle>
          <DialogDescription>{MONTHS[month - 1]} {year} · One purchase suggestion across all three vans, not a separate order for each van.</DialogDescription>
        </DialogHeader>
        {stale && <p role="alert" className="rounded-lg border p-3 text-sm text-pending">Connection lost. Quantities are last known values—refresh inventory before ordering.</p>}
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border p-3"><dt className="text-muted-foreground">Van {item.van_id} stock</dt><dd className="mt-1 text-xl font-semibold">{plan.vanStock ?? 'Unknown'}</dd></div>
          <div className="rounded-lg border p-3"><dt className="text-muted-foreground">All vans combined</dt><dd className="mt-1 text-xl font-semibold">{plan.fleetStock ?? 'Unknown'}</dd></div>
          <div className="rounded-lg border p-3"><dt className="text-muted-foreground">Expected month usage</dt><dd className="mt-1 text-xl font-semibold">{plan.monthlyUsage ?? 'Not available'}</dd></div>
          <div className="rounded-lg border p-3"><dt className="text-muted-foreground">Target fleet stock</dt><dd className="mt-1 text-xl font-semibold">{plan.targetStock} units</dd></div>
        </dl>
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4" data-testid="restock-suggested-quantity">
          <p className="text-sm text-muted-foreground">Suggested purchase · all vans</p>
          <p className="mt-1 text-3xl font-semibold">{plan.suggestedBuy ?? 'Unknown'} <span className="text-base font-normal">units</span></p>
          <p className="mt-2 text-sm">{plan.hasUsageData
            ? `${plan.monthlyUsage} expected usage + 5 spare − ${plan.fleetStock ?? '?'} already stocked.`
            : 'No accessory usage example exists for this part. This is only a minimum five-unit fleet buffer, not a usage forecast.'}</p>
        </div>
        {plan.vanTopUp != null && plan.vanTopUp > 0 && <p className="flex items-start gap-2 text-sm"><Boxes size={16} className="mt-0.5 shrink-0" />
          <span>Van {item.van_id} needs {plan.vanTopUp} more units to reach 5. Check other vans for a transfer before placing a purchase.
            {plan.suggestedBuy === 0 && ' No fleet purchase is currently needed.'}</span>
        </p>}
        <p className="text-xs text-muted-foreground">Usage figures are fictional examples from Workshop Analysis. Suggestions update with saved stock; opening this plan does not purchase parts or change inventory.</p>
        <Button asChild variant="outline"><Link href="/workshop-analysis">View accessory usage analysis</Link></Button>
      </DialogContent>
    </Dialog>
  );
}
