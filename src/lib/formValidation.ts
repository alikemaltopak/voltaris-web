// The same rules run again in apps-script/Kod.gs; keep the two in step.

/** Something@domain.tld: ad@gmail.com, ad@std.iyte.edu.tr. */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

/** Digits with the usual separators, and an optional leading +. */
const PHONE_CHARS = /^\+?[\d\s().-]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

/**
 * 10 to 15 digits: 0532 123 45 67, 532 123 45 67, +90 532 123 45 67, and
 * foreign numbers up to the international maximum.
 */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  if (!PHONE_CHARS.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, "").length;
  return digits >= 10 && digits <= 15;
}
