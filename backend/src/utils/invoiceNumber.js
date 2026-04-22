/**
 * Invoice number format: INV-000-001, INV-000-002, …
 */
const PREFIX = 'INV-000-';
const REGEX = /^INV-000-(\d+)$/i;

function formatInvoiceNumber(seq) {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return `${PREFIX}${String(n).padStart(3, '0')}`;
}

function maxInvoiceSeqFromNumbers(numbers) {
  let maxN = 0;
  for (const s of numbers) {
    const m = REGEX.exec(String(s || '').trim());
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return maxN;
}

module.exports = { PREFIX, REGEX, formatInvoiceNumber, maxInvoiceSeqFromNumbers };

