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

export const formatIndianPhone = (num: string | null | undefined): string => {
  if (!num) return "Not set";
  const clean = cleanIndianPhone(num);
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return num;
};
