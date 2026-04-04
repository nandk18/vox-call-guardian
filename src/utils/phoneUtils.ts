export const cleanIndianPhone = (phone: string): string => {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  const cleaned = digits.startsWith("91") && digits.length > 10
    ? digits.slice(2)
    : digits.startsWith("0")
    ? digits.slice(1)
    : digits;
  return cleaned.slice(-10);
};

export const formatPhoneDisplay = (num: string | null | undefined): string => {
  if (!num) return "Not set";
  const clean = num.replace(/\D/g, "");
  // US number: starts with 1, 11 digits
  if (clean.startsWith("1") && clean.length === 11) {
    return `+1 ${clean.slice(1, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  // Indian: starts with 91, 12 digits
  if (clean.startsWith("91") && clean.length === 12) {
    const n = clean.slice(2);
    return `+91 ${n.slice(0, 5)} ${n.slice(5)}`;
  }
  // Already has + prefix — return as is
  if (num.startsWith("+")) return num;
  // 10 digit Indian fallback
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return num;
};

/** @deprecated Use formatPhoneDisplay instead */
export const formatIndianPhone = formatPhoneDisplay;
