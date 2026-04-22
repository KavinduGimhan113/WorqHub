/**
 * Match backend WIDGET-### SKUs for consistent list order (001, 002, 003, …).
 */
const WIDGET_SKU = /^WIDGET-(\d+)$/i;

export function compareWidgetSkus(skuA, skuB) {
  const na = widgetNumber(skuA);
  const nb = widgetNumber(skuB);
  if (na != null && nb != null) return na - nb;
  if (na != null) return -1;
  if (nb != null) return 1;
  return String(skuA || '').localeCompare(String(skuB || ''), undefined, { numeric: true, sensitivity: 'base' });
}

function widgetNumber(sku) {
  const m = WIDGET_SKU.exec(String(sku || '').trim());
  return m ? parseInt(m[1], 10) : null;
}

export function sortInventoryByWidgetSku(items) {
  if (!Array.isArray(items)) return [];
  return [...items].sort((a, b) => compareWidgetSkus(a.sku, b.sku));
}
