/**
 * Invoice PDF — freelance-style layout aligned with WorqHub UI (orange #F06021, slate text).
 */
const PDFDocument = require('pdfkit');

/** Mirrors frontend :root light theme */
const UI = {
  primary: '#F06021',
  primaryHover: '#d94e0f',
  primaryLight: '#fff5f0',
  text: '#1f2937',
  textMuted: '#64748b',
  border: '#e2e8f0',
  surface: '#ffffff',
  bg: '#f8fafc',
  white: '#ffffff',
};

const PAGE = { w: 612, h: 792, margin: 48, bottom: 748 };

function money(amount, currency) {
  const c = /^[A-Z]{3}$/.test(String(currency || '').toUpperCase())
    ? String(currency).toUpperCase()
    : 'USD';
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(Number(amount) || 0);
  } catch {
    return `$${(Number(amount) || 0).toFixed(2)}`;
  }
}

function lineAmount(item) {
  if (item.amount != null) return Number(item.amount);
  return (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
}

/** MM/DD/YYYY like common US invoices */
function fmtDateUs(d) {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function paymentTermsLabel(issued, due) {
  if (!due) return 'Per agreement';
  try {
    const i = new Date(issued).setHours(0, 0, 0, 0);
    const d = new Date(due).setHours(0, 0, 0, 0);
    const days = Math.round((d - i) / 86400000);
    if (!Number.isFinite(days)) return 'Per agreement';
    if (days <= 0) return 'Due on receipt';
    return `Net ${days}`;
  } catch {
    return 'Per agreement';
  }
}

function workOrderRef(invoice) {
  const wo = invoice.workOrderId;
  if (!wo || typeof wo !== 'object') return null;
  const n = wo.workOrderNumber != null ? Number(wo.workOrderNumber) : NaN;
  const num = Number.isFinite(n) && n >= 1 ? String(Math.floor(n)).padStart(3, '0') : null;
  const title = (wo.title && String(wo.title).trim()) || '';
  if (num && title) return `WO-${num} · ${title}`;
  if (title) return title;
  if (num) return `Work order #${num}`;
  return null;
}

/* Table: DATE | DESCRIPTION | QTY | RATE | AMOUNT */
const COL = {
  left: 48,
  dateX: 48,
  dateW: 62,
  descX: 118,
  descW: 232,
  qtyX: 354,
  qtyW: 36,
  rateX: 394,
  rateW: 68,
  amtX: 466,
  amtW: 98,
  right: 564,
};

const HEADER_BAR_H = 40;
const TABLE_HEAD_H = 26;

function drawLineItemsHeader(doc, y) {
  const w = COL.right - COL.left;
  doc.save();
  doc.strokeColor(UI.primary).lineWidth(1.25);
  doc.moveTo(COL.left, y).lineTo(COL.right, y).stroke();
  doc.rect(COL.left, y, w, TABLE_HEAD_H).fill(UI.primaryLight);
  doc.fillColor(UI.text).font('Helvetica-Bold').fontSize(7.5);
  const ty = y + 9;
  doc.text('DATE', COL.dateX + 2, ty, { width: COL.dateW - 4 });
  doc.text('DESCRIPTION / SERVICE', COL.descX, ty, { width: COL.descW });
  doc.text('QTY', COL.qtyX, ty, { width: COL.qtyW, align: 'right' });
  doc.text('RATE', COL.rateX, ty, { width: COL.rateW, align: 'right' });
  doc.text('AMOUNT', COL.amtX, ty, { width: COL.amtW, align: 'right' });
  doc.strokeColor(UI.primary).lineWidth(1.25);
  doc.moveTo(COL.left, y + TABLE_HEAD_H).lineTo(COL.right, y + TABLE_HEAD_H).stroke();
  doc.restore();
  return y + TABLE_HEAD_H;
}

function rowHeight(doc, text, width) {
  doc.font('Helvetica').fontSize(9);
  return Math.max(18, doc.heightOfString(text, { width }) + 10);
}

function labelCaps(doc, text, x, y, w) {
  doc.font('Helvetica-Bold').fontSize(7).fillColor(UI.primary).text(text.toUpperCase(), x, y, { width: w });
}

function buildInvoicePdf(doc, { tenant, invoice, customer }) {
  const currency = tenant?.settings?.currency || 'USD';
  const orgName = tenant?.name || 'Organization';
  const items = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
  const sub =
    invoice.subtotal != null ? Number(invoice.subtotal) : items.reduce((s, r) => s + lineAmount(r), 0);
  const discountAmt = Number(invoice.discountAmount) || 0;
  const discPct = Number(invoice.discountPercent) || 0;
  const tax = Number(invoice.tax) || 0;
  const storedTotal = invoice.total != null ? Number(invoice.total) : NaN;
  const total = Number.isFinite(storedTotal)
    ? storedTotal
    : Math.round((sub - discountAmt + tax) * 100) / 100;
  const issued = invoice.createdAt || new Date();
  const serviceDateStr = fmtDateUs(issued);
  const woLine = workOrderRef(invoice);
  const totalQty = items.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const avgRate =
    totalQty > 0 ? sub / totalQty : 0;

  let y = 0;

  /* Full-width brand header bar (matches app primary buttons) */
  doc.save();
  doc.rect(0, 0, PAGE.w, HEADER_BAR_H).fill(UI.primary);
  doc.fillColor(UI.white).font('Helvetica-Bold').fontSize(13);
  doc.text('INVOICE', PAGE.margin, 13, { width: 280 });
  doc.font('Helvetica-Bold').fontSize(12);
  doc.text(`# ${invoice.number || '—'}`, 300, 14, {
    width: PAGE.w - PAGE.margin - 300,
    align: 'right',
  });
  doc.restore();

  y = HEADER_BAR_H + 22;

  /* FROM | BILL TO */
  const colW = (PAGE.w - PAGE.margin * 2 - 24) / 2;
  const rightColX = PAGE.margin + colW + 24;

  labelCaps(doc, 'FROM', PAGE.margin, y, colW);
  labelCaps(doc, 'BILL TO', rightColX, y, colW);
  y += 14;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(UI.text).text(orgName, PAGE.margin, y, { width: colW });
  if (customer) {
    doc.text(customer.name || '—', rightColX, y, { width: colW });
  } else {
    doc.fillColor(UI.textMuted).text('No customer assigned', rightColX, y, { width: colW });
  }
  y += 15;

  doc.font('Helvetica').fontSize(9).fillColor(UI.textMuted).lineGap(2);
  const fromSub = 'Services & billing · Issued through WorqHub';
  doc.text(fromSub, PAGE.margin, y, { width: colW });
  let billBlock = '';
  if (customer) {
    const addr = customer.billingAddress || customer.address;
    if (addr) billBlock += String(addr);
    if (customer.email || customer.phone) {
      if (billBlock) billBlock += '\n';
      const parts = [];
      if (customer.email) parts.push(customer.email);
      if (customer.phone) parts.push(customer.phone);
      billBlock += parts.join('  |  ');
    }
    if (billBlock) {
      doc.fillColor(UI.text).text(billBlock, rightColX, y, { width: colW, lineGap: 3 });
    }
  }
  const leftH = doc.heightOfString(fromSub, { width: colW });
  const rightH = billBlock ? doc.heightOfString(billBlock, { width: colW }) : customer ? 14 : leftH;
  y += Math.max(leftH, rightH, 28) + 8;

  doc.strokeColor(UI.border).lineWidth(0.75);
  doc.moveTo(PAGE.margin, y).lineTo(PAGE.w - PAGE.margin, y).stroke();
  y += 14;

  /* Invoice date | Due date | Payment terms */
  const third = (PAGE.w - PAGE.margin * 2) / 3;
  doc.font('Helvetica').fontSize(8).fillColor(UI.textMuted).text('Invoice date', PAGE.margin, y, { width: third });
  doc.text('Due date', PAGE.margin + third, y, { width: third });
  doc.text('Payment terms', PAGE.margin + third * 2, y, { width: third });
  y += 12;
  doc.font('Helvetica-Bold').fontSize(10).fillColor(UI.text);
  doc.text(fmtDateUs(issued), PAGE.margin, y, { width: third });
  doc.text(fmtDateUs(invoice.dueDate), PAGE.margin + third, y, { width: third });
  doc.fillColor(UI.primary).text(paymentTermsLabel(issued, invoice.dueDate), PAGE.margin + third * 2, y, {
    width: third,
  });
  y += 22;

  if (woLine) {
    doc.font('Helvetica').fontSize(8).fillColor(UI.textMuted).text('Reference: ', PAGE.margin, y, { continued: true });
    doc.fillColor(UI.text).text(woLine, { continued: false });
    y += 16;
  }

  /* Line items */
  const tableReserve = 220;
  y = drawLineItemsHeader(doc, y);

  for (const row of items) {
    const desc = row.description || '—';
    const qty = Number(row.quantity) || 0;
    const unit = Number(row.unitPrice) || 0;
    const amt = lineAmount(row);
    const h = rowHeight(doc, desc, COL.descW);

    if (y + h > PAGE.bottom - tableReserve) {
      doc.addPage();
      y = PAGE.margin;
      y = drawLineItemsHeader(doc, y);
    }

    doc.font('Helvetica').fontSize(9).fillColor(UI.textMuted).text(serviceDateStr, COL.dateX + 2, y + 5, {
      width: COL.dateW - 4,
    });
    doc.fillColor(UI.text).text(desc, COL.descX, y + 5, { width: COL.descW, lineGap: 1 });
    doc.text(String(qty), COL.qtyX, y + 5, { width: COL.qtyW, align: 'right' });
    doc.text(money(unit, currency), COL.rateX, y + 5, { width: COL.rateW, align: 'right' });
    doc.font('Helvetica-Bold').text(money(amt, currency), COL.amtX, y + 5, { width: COL.amtW, align: 'right' });
    doc.font('Helvetica');

    y += h;
    doc.moveTo(COL.left, y).lineTo(COL.right, y).strokeColor(UI.border).lineWidth(0.35).stroke();
  }

  if (items.length === 0) {
    doc.font('Helvetica-Oblique').fontSize(9).fillColor(UI.textMuted).text('No line items.', COL.descX, y + 10, {
      width: COL.descW,
    });
    y += 36;
  }

  y += 20;

  /* Line summary (left) + financial summary (right) */
  const sumBlockW = 200;
  const sumX = COL.right - sumBlockW;

  const summaryTop = y;
  labelCaps(doc, 'LINE SUMMARY', PAGE.margin, y, 200);
  doc.font('Helvetica').fontSize(8).fillColor(UI.textMuted).text('Total quantity', PAGE.margin, y + 14);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(UI.text).text(String(totalQty.toFixed(totalQty % 1 ? 2 : 0)), PAGE.margin, y + 26);
  doc.font('Helvetica').fontSize(8).fillColor(UI.textMuted).text('Avg. unit rate', PAGE.margin, y + 42);
  doc.font('Helvetica-Bold').fontSize(10).fillColor(UI.text).text(money(avgRate, currency), PAGE.margin, y + 54);

  function sumRow(label, value, opts = {}) {
    const { bold = false, size = 9 } = opts;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(size)
      .fillColor(bold ? UI.text : UI.textMuted);
    doc.text(label, sumX, y, { width: 90, align: 'right' });
    doc.fillColor(UI.text).font(bold ? 'Helvetica-Bold' : 'Helvetica').text(value, sumX + 96, y, {
      width: sumBlockW - 96,
      align: 'right',
    });
    y += size + 7;
  }

  y = summaryTop;
  sumRow('Subtotal', money(sub, currency));
  if (discountAmt > 0) {
    const discLabel = discPct > 0 ? `Discount (${discPct}%)` : 'Discount';
    sumRow(discLabel, money(-discountAmt, currency));
  }
  sumRow('Gov. tax (fixed)', money(tax, currency));
  y += 4;
  doc.strokeColor(UI.border).lineWidth(0.75);
  doc.moveTo(sumX, y).lineTo(COL.right, y).stroke();
  y += 12;
  y = Math.max(y, summaryTop + 72);

  const totalBarH = 30;
  if (y + totalBarH > PAGE.bottom - 100) {
    doc.addPage();
    y = PAGE.margin;
  }

  doc.save();
  doc.rect(PAGE.margin, y, PAGE.w - PAGE.margin * 2, totalBarH).fill(UI.primary);
  doc.fillColor(UI.white).font('Helvetica-Bold').fontSize(11);
  const paid = String(invoice.status).toLowerCase() === 'paid';
  doc.text(paid ? 'PAID IN FULL' : 'TOTAL', PAGE.margin + 12, y + 9, { width: 120 });
  doc.font('Helvetica-Bold').fontSize(13).text(money(total, currency), PAGE.margin, y + 7, {
    width: PAGE.w - PAGE.margin * 2 - 24,
    align: 'right',
  });
  doc.restore();
  y += totalBarH + 22;

  /* Payment methods + terms */
  if (y > PAGE.bottom - 130) {
    doc.addPage();
    y = PAGE.margin;
  }

  labelCaps(doc, 'PAYMENT METHODS', PAGE.margin, y, PAGE.w - PAGE.margin * 2);
  y += 12;
  doc.font('Helvetica').fontSize(8).fillColor(UI.textMuted).lineGap(3);
  const payText =
    'Remit by bank transfer, check, or your agreed payment channel. Include the invoice number on all payments. For wiring instructions or portal links, contact your account representative.';
  const bodyW = PAGE.w - PAGE.margin * 2;
  doc.text(payText, PAGE.margin, y, { width: bodyW });
  y += doc.heightOfString(payText, { width: bodyW }) + 14;

  doc.strokeColor(UI.border).lineWidth(0.75);
  doc.moveTo(PAGE.margin, y).lineTo(PAGE.w - PAGE.margin, y).stroke();
  y += 12;

  doc.font('Helvetica').fontSize(8).fillColor(UI.textMuted);
  const dueNote = invoice.dueDate
    ? `Amount due by ${fmtDateUs(invoice.dueDate)} unless otherwise agreed.`
    : 'Payment terms as shown above.';
  doc.text(dueNote, PAGE.margin, y, { width: bodyW });
  y += doc.heightOfString(dueNote, { width: bodyW }) + 6;

  if (String(invoice.status).toLowerCase() === 'overdue') {
    doc.font('Helvetica-Bold').fillColor(UI.primaryHover).text(
      'This invoice is overdue. Please submit payment as soon as possible.',
      PAGE.margin,
      y,
      { width: bodyW }
    );
    y += 18;
  }

  doc.font('Helvetica').fontSize(7).fillColor(UI.textMuted).text(
    'Electronic invoice — valid without signature. Questions: use your organization’s billing contact.',
    PAGE.margin,
    y,
    { width: bodyW }
  );
  y += 28;

  doc.font('Helvetica-Bold').fontSize(11).fillColor(UI.primary).text('Thank you for your business!', PAGE.margin, y, {
    width: bodyW,
    align: 'center',
  });
  y += 24;

  doc.font('Helvetica').fontSize(7).fillColor(UI.textMuted).text(
    `Generated ${new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · ${orgName} · WorqHub`,
    PAGE.margin,
    y,
    { width: bodyW, align: 'center' }
  );
}

function streamInvoicePdf(res, { tenant, invoice, customer }) {
  const doc = new PDFDocument({
    size: 'LETTER',
    margin: 0,
    info: {
      Title: `Invoice ${invoice.number || ''}`,
      Author: tenant?.name || 'WorqHub',
      Subject: 'Invoice',
    },
  });
  doc.pipe(res);
  buildInvoicePdf(doc, { tenant, invoice, customer });
  doc.end();
}

module.exports = { streamInvoicePdf };
