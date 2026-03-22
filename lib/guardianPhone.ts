export const GUARDIAN_PHONE_EXAMPLE = "94771234567";

const GUARDIAN_PHONE_LENGTH = 11;
const VALID_GUARDIAN_PHONE_PATTERN = /^947\d{8}$/;

function stripToDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function normalizeGuardianPhone(phone: string) {
  const digitsOnly = stripToDigits(phone.trim());
  if (!digitsOnly) return "";

  if (digitsOnly.startsWith("94")) {
    return digitsOnly.slice(0, GUARDIAN_PHONE_LENGTH);
  }

  if (digitsOnly.startsWith("0")) {
    return `94${digitsOnly.slice(1, 10)}`.slice(0, GUARDIAN_PHONE_LENGTH);
  }

  if (digitsOnly.startsWith("7")) {
    return `94${digitsOnly.slice(0, 9)}`.slice(0, GUARDIAN_PHONE_LENGTH);
  }

  return digitsOnly.slice(0, GUARDIAN_PHONE_LENGTH);
}

export function sanitizeGuardianPhoneInput(phone: string) {
  return normalizeGuardianPhone(phone);
}

export function isValidGuardianPhone(phone: string) {
  return VALID_GUARDIAN_PHONE_PATTERN.test(normalizeGuardianPhone(phone));
}
