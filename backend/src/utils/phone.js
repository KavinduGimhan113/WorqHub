/**
 * Phone validation for employee/customer contact fields.
 */
function validatePhone(phone) {
  if (phone == null || String(phone).trim() === '') {
    return { ok: true, value: undefined };
  }
  const trimmed = String(phone).trim();
  if (!/^[\d\s\-+().]+$/.test(trimmed)) {
    return { ok: false, message: 'Phone number may only contain digits, spaces, and + - ( ) .' };
  }
  const digits = trimmed.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return { ok: false, message: 'Phone number must contain 7 to 15 digits.' };
  }
  return { ok: true, value: trimmed };
}

module.exports = { validatePhone };
