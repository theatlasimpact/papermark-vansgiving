const LINK_DELETER_ROLES = [
  "OWNER",
  "ADMIN",
  "MANAGER",
  "MEMBER",
] as const;

export type LinkMembership = {
  role?: string | null;
  blockedAt?: Date | string | null;
  suspendedAt?: Date | string | null;
  disabled?: boolean | null;
  disabledAt?: Date | string | null;
  status?: string | null;
};

export function canDeleteLink(
  membership: LinkMembership | null | undefined,
): boolean {
  if (!membership) {
    return false;
  }

  if (
    membership.blockedAt ||
    membership.suspendedAt ||
    membership.disabled ||
    membership.disabledAt ||
    (membership.status && membership.status !== "ACTIVE")
  ) {
    return false;
  }

  const role = membership.role?.toUpperCase();
  return (
    !!role &&
    (LINK_DELETER_ROLES as readonly string[]).includes(role as string)
  );
}

export { LINK_DELETER_ROLES };
