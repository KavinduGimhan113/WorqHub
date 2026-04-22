/**
 * Auto SKU format: WIDGET-001, WIDGET-002, …
 */
const SKU_PREFIX = 'WIDGET-';
const SKU_REGEX = /^WIDGET-(\d+)$/i;

function formatSku(seq) {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return `${SKU_PREFIX}${String(n).padStart(3, '0')}`;
}

function maxWidgetNumberFromSkus(skus) {
  let maxN = 0;
  for (const s of skus) {
    const m = SKU_REGEX.exec(String(s || '').trim());
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return maxN;
}

/** Parsed WIDGET-### index for sorting; null if SKU does not match. */
function widgetNumberFromSku(sku) {
  const m = SKU_REGEX.exec(String(sku || '').trim());
  return m ? parseInt(m[1], 10) : null;
}

/** Sort WIDGET-001, WIDGET-002, … by numeric suffix; other SKUs after, alphabetically. */
function compareWidgetSkus(skuA, skuB) {
  const na = widgetNumberFromSku(skuA);
  const nb = widgetNumberFromSku(skuB);
  if (na != null && nb != null) return na - nb;
  if (na != null) return -1;
  if (nb != null) return 1;
  return String(skuA || '').localeCompare(String(skuB || ''), undefined, { numeric: true, sensitivity: 'base' });
}

module.exports = {
  SKU_PREFIX,
  SKU_REGEX,
  formatSku,
  maxWidgetNumberFromSkus,
  widgetNumberFromSku,
  compareWidgetSkus,
};
