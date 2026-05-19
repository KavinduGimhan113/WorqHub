/**
 * Money formatting aligned with tenant currency (invoice PDF / settings).
 */
export function normalizeCurrencyCode(currency) {
  const s = String(currency || 'USD').toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : 'USD';
}

export function formatMoneyAmount(n) {
  return (Number(n) || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** @deprecated Use formatMoneyAmount — kept for legacy call sites */
export const formatMoneyLkr = formatMoneyAmount;

export function formatMoney(n, currency) {
  const code = normalizeCurrencyCode(currency);
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(Number(n) || 0);
  } catch {
    return `${formatMoneyAmount(n)} ${code}`;
  }
}
