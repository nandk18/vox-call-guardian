export const ADMIN_EMAILS = ["nandhakishorev2003@gmail.com"];

export const isAdminEmail = (email?: string | null) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());
