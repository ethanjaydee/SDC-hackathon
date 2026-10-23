import { PDFDocument, StandardFonts, degrees, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { SampleEInvoice } from '@workspace/api-client-react';

const ink = rgb(0.10, 0.14, 0.16);
const muted = rgb(0.36, 0.40, 0.42);
const line = rgb(0.70, 0.73, 0.74);
const amber = rgb(0.78, 0.30, 0.08);

function safeText(value: string | number) {
  return String(value).normalize('NFKD').replace(/[^\x20-\x7e]/g, '').trim();
}

function dateText(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return safeText(value);
  return date.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' });
}

function wrapText(text: string, font: PDFFont, size: number, width: number) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && font.widthOfTextAtSize(candidate, size) > width) {
      lines.push(current);
      current = word;
    } else current = candidate;
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function belowThousand(value: number): string {
  const ones = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  const parts: string[] = [];
  if (value >= 100) {
    parts.push(`${ones[Math.floor(value / 100)]} hundred`);
    value %= 100;
  }
  if (value >= 20) {
    parts.push(`${tens[Math.floor(value / 10)]}${value % 10 ? `-${ones[value % 10]}` : ''}`);
  } else if (value >= 10) parts.push(teens[value - 10]);
  else if (value > 0 || parts.length === 0) parts.push(ones[value]);
  return parts.join(' ');
}

function amountInWords(amount: number) {
  const whole = Math.floor(amount);
  const cents = Math.round((amount - whole) * 100);
  const major = whole >= 1000 ? `${whole}` : belowThousand(whole);
  const minor = cents ? ` AND ${belowThousand(cents)} SEN` : '';
  return `RINGGIT MALAYSIA: ${major.toUpperCase()}${minor} ONLY`;
}

function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  maxWidth: number,
  lineHeight = size + 3,
) {
  const lines = wrapText(text, font, size, maxWidth);
  lines.forEach((item, index) => page.drawText(item, { x, y: y - index * lineHeight, font, size, color: ink }));
  return lines.length * lineHeight;
}

export async function createSampleInvoicePdf(invoice: SampleEInvoice, logoPng: Uint8Array) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Sample invoice ${safeText(invoice.invoice_number)}`);
  pdf.setSubject('Illustrative sample only - not payable and not a compliant tax invoice');
  pdf.setCreator('Dispatch Hub sample invoice generator');
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo = await pdf.embedPng(logoPng);

  page.drawImage(logo, { x: 36, y: 774, width: 56, height: 56 });
  page.drawText('DISPATCH HUB SAMPLE SERVICES SDN BHD', { x: 106, y: 812, font: bold, size: 12, color: ink });
  page.drawText('(SAMPLE BUSINESS DETAILS - NOT REGISTERED)', { x: 106, y: 797, font: regular, size: 7.5, color: muted });
  page.drawText('No. 1, Jalan Contoh, 47100 Puchong, Selangor, Malaysia', { x: 106, y: 783, font: regular, size: 8, color: ink });
  page.drawText('Phone: Not configured   Email: billing@example.invalid', { x: 106, y: 770, font: regular, size: 8, color: ink });
  page.drawText('Business No: SAMPLE ONLY   TIN: SAMPLE ONLY', { x: 106, y: 757, font: regular, size: 8, color: ink });

  page.drawLine({ start: { x: 32, y: 738 }, end: { x: 563, y: 738 }, thickness: 1, color: line });
  const title = 'SAMPLE SERVICE INVOICE';
  page.drawText(title, { x: (595.28 - bold.widthOfTextAtSize(title, 15)) / 2, y: 716, font: bold, size: 15, color: ink });
  const warning = 'NOT PAYABLE - NOT A COMPLIANT TAX INVOICE';
  page.drawText(warning, { x: (595.28 - bold.widthOfTextAtSize(warning, 8)) / 2, y: 701, font: bold, size: 8, color: amber });

  page.drawText('BILL TO', { x: 38, y: 674, font: bold, size: 8, color: muted });
  page.drawText('Demo Customer', { x: 38, y: 658, font: bold, size: 10, color: ink });
  page.drawText('Demo customer address, Klang Valley, Malaysia', { x: 38, y: 644, font: regular, size: 8, color: ink });
  page.drawText('Customer / tax identifiers: not provided', { x: 38, y: 631, font: regular, size: 8, color: muted });

  const detailX = 350;
  const detailRows = [
    ['Invoice No.', invoice.invoice_number],
    ['Your Ref.', invoice.job_number],
    ['Terms', 'Sample only'],
    ['Date', dateText(invoice.generated_at)],
    ['Page', '1 of 1'],
  ];
  detailRows.forEach(([label, value], index) => {
    const y = 674 - index * 14;
    page.drawText(label, { x: detailX, y, font: regular, size: 8, color: muted });
    page.drawText(':', { x: detailX + 70, y, font: regular, size: 8, color: muted });
    page.drawText(safeText(value), { x: detailX + 80, y, font: index === 0 ? bold : regular, size: 8, color: ink });
  });

  const tableTop = 590;
  page.drawLine({ start: { x: 32, y: tableTop }, end: { x: 563, y: tableTop }, thickness: 0.8, color: ink });
  page.drawText('No.', { x: 38, y: tableTop - 16, font: bold, size: 7.5, color: ink });
  page.drawText('Service details', { x: 74, y: tableTop - 16, font: bold, size: 7.5, color: ink });
  page.drawText('Qty', { x: 366, y: tableTop - 16, font: bold, size: 7.5, color: ink });
  page.drawText('Unit price (MYR)', { x: 405, y: tableTop - 16, font: bold, size: 7.5, color: ink });
  page.drawText('Amount (MYR)', { x: 493, y: tableTop - 16, font: bold, size: 7.5, color: ink });
  page.drawLine({ start: { x: 32, y: tableTop - 22 }, end: { x: 563, y: tableTop - 22 }, thickness: 0.5, color: line });

  const description = invoice.line_description || invoice.job_scope;
  const rowHeight = drawWrapped(page, description, 74, tableTop - 42, regular, 8, 270);
  page.drawText('1', { x: 39, y: tableTop - 42, font: regular, size: 8, color: ink });
  page.drawText('1.00 UNIT', { x: 360, y: tableTop - 42, font: regular, size: 7.5, color: ink });
  const amount = `MYR ${invoice.amount_myr.toFixed(2)}`;
  page.drawText(amount, { x: 405, y: tableTop - 42, font: regular, size: 7.5, color: ink });
  page.drawText(amount, { x: 493, y: tableTop - 42, font: bold, size: 7.5, color: ink });
  const tableBottom = tableTop - Math.max(70, rowHeight + 44);
  page.drawLine({ start: { x: 32, y: tableBottom }, end: { x: 563, y: tableBottom }, thickness: 0.8, color: ink });

  page.drawText(amountInWords(invoice.amount_myr), { x: 38, y: tableBottom - 24, font: regular, size: 7.5, color: ink });
  page.drawText('Sample totals only. No tax rate, tax amount, or payment details are asserted.', { x: 38, y: tableBottom - 39, font: regular, size: 7, color: muted });
  page.drawRectangle({ x: 365, y: tableBottom - 82, width: 198, height: 34, borderColor: line, borderWidth: 0.8 });
  page.drawText('TOTAL AMOUNT (MYR)', { x: 375, y: tableBottom - 61, font: regular, size: 8, color: muted });
  page.drawText(invoice.amount_myr.toFixed(2), { x: 482, y: tableBottom - 70, font: bold, size: 11, color: ink });

  page.drawLine({ start: { x: 32, y: 105 }, end: { x: 563, y: 105 }, thickness: 0.6, color: line });
  drawWrapped(
    page,
    'This AI-generated example uses fictional business and customer details. It is not payable, not an issued invoice, and not a compliant Malaysian e-Invoice.',
    38, 88, regular, 7.5, 515, 10,
  );
  return pdf.save();
}
