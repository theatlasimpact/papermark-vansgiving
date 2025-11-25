export const UNRESTRICTED_ADMIN_EMAILS = [
  "van@theatlasimpact.com",
];

export function isUnrestrictedAdmin(email?: string | null): boolean {
  if (!email) return false;
  return UNRESTRICTED_ADMIN_EMAILS.includes(email.toLowerCase());
}
