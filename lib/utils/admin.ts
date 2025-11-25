export const PRIVILEGED_ADMIN_EMAIL = "van@theatlasimpact.com";
export const PRIVILEGED_ADMIN_DOMAIN = "sponsor.joinvansgiving.com";

export function isPrivilegedAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === PRIVILEGED_ADMIN_EMAIL;
}

export function isPrivilegedDomain(domain?: string | null): boolean {
  if (!domain) return false;
  return domain.trim().toLowerCase() === PRIVILEGED_ADMIN_DOMAIN;
}
