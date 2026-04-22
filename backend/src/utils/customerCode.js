/**
 * Display customer IDs: CUS-001, CUS-002, …
 */
const CODE_PREFIX = 'CUS-';
const CODE_REGEX = /^CUS-(\d+)$/i;

function formatCustomerCode(seq) {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return `${CODE_PREFIX}${String(n).padStart(3, '0')}`;
}

function maxCustomerNumberFromCodes(codes) {
  let maxN = 0;
  for (const c of codes) {
    const m = CODE_REGEX.exec(String(c || '').trim());
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return maxN;
}

function customerNumberFromCode(code) {
  const m = CODE_REGEX.exec(String(code || '').trim());
  return m ? parseInt(m[1], 10) : null;
}

/** True if value is a canonical CUS-### code (used for backfill detection). */
function isValidCustomerCode(code) {
  return CODE_REGEX.test(String(code || '').trim());
}

/** Sort CUS-001, CUS-002, … by numeric suffix; other values after, alphabetically. */
function compareCustomerCodes(a, b) {
  const na = customerNumberFromCode(a);
  const nb = customerNumberFromCode(b);
  if (na != null && nb != null) return na - nb;
  if (na != null) return -1;
  if (nb != null) return 1;
  return String(a || '').localeCompare(String(b || ''), undefined, { numeric: true, sensitivity: 'base' });
}

module.exports = {
  CODE_PREFIX,
  CODE_REGEX,
  formatCustomerCode,
  maxCustomerNumberFromCodes,
  customerNumberFromCode,
  isValidCustomerCode,
  compareCustomerCodes,
};
