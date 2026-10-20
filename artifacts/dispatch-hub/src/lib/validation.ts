import { z } from 'zod';

export const intakeSchema = z.object({
  text: z.string().trim().min(1, 'Describe the repair issue.').max(5000, 'Use 5,000 characters or fewer.'),
  customer_site_id: z.enum(['north', 'central', 'south']),
});
export const positiveIdSchema = z.number().int().positive();
export const positiveQuantitySchema = z.coerce.number()
  .int('Enter a whole number.').min(1, 'Enter at least 1.').max(10000, 'Enter 10,000 or fewer.');
const publicUrl = z.string().trim().max(2048).url('Enter a complete http(s) product URL.')
  .refine((value) => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password; }
    catch { return false; }
  }, 'Use an http(s) URL without credentials.');
const amount = z.number().finite().max(1_000_000);
export const supplierQuoteSchema = z.object({
  search_term: z.string().trim().min(2).max(120),
  part_name: z.string().trim().min(2).max(120),
  part_number: z.string().trim().min(1).max(120).nullable().optional(),
  product_name: z.string().trim().min(2, 'Enter the product name.').max(200),
  supplier_name: z.string().trim().min(2, 'Enter the store name.').max(120),
  product_url: publicUrl,
  price_myr: amount.positive('Enter a price greater than zero.'),
  availability_note: z.enum(['In stock', 'Limited stock', 'Out of stock', 'Not checked']),
  quality_rating: z.number().int().min(1).max(5),
  quality_evidence_note: z.string().trim().min(5, 'Describe the evidence behind this rating.').max(400),
  package_quantity: z.number().int().min(1).max(100000).optional(),
  minimum_order_packs: z.number().int().min(1).max(100000).optional(),
  shipping_myr: amount.nonnegative().nullable().optional(),
});
