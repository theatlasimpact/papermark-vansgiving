import {
  isAppShareHost,
  isLegacyRootDomain,
  RESERVED_SLUGS,
  SLUG_PATTERN,
} from "@/lib/brand";
import prisma from "@/lib/prisma";

export type ResolvedShareDomain = {
  domain: string | null;
  slug: string | null;
  domainId: string | null;
};

/**
 * Readable slugs (for example /mater-dei-gym-energy) are stored against a
 * domain. The share host itself does not need a row in the domains table.
 * Extra custom domains still do.
 */
export async function resolveShareDomain(input: {
  domain?: string | null;
  slug?: string | null;
  currentLinkId?: string;
}): Promise<
  { ok: true; value: ResolvedShareDomain } | { ok: false; error: string }
> {
  const domain = input.domain?.trim().toLowerCase() || null;
  const slug = input.slug?.trim().toLowerCase() || null;

  if (!domain || isLegacyRootDomain(domain)) {
    return { ok: true, value: { domain: null, slug: null, domainId: null } };
  }

  if (!slug) {
    return {
      ok: false,
      error: "Add a link name such as mater-dei-gym-energy.",
    };
  }

  if (!SLUG_PATTERN.test(slug) || RESERVED_SLUGS.has(slug)) {
    return {
      ok: false,
      error:
        "Use letters, numbers, and hyphens. Names like dashboard or login are reserved.",
    };
  }

  const domainRow = await prisma.domain.findUnique({
    where: { slug: domain },
  });

  if (!domainRow && !isAppShareHost(domain)) {
    return { ok: false, error: "Domain not found." };
  }

  const existing = await prisma.link.findUnique({
    where: {
      domainSlug_slug: {
        slug,
        domainSlug: domain,
      },
    },
    select: { id: true },
  });

  if (existing && existing.id !== input.currentLinkId) {
    return { ok: false, error: "That link name is already in use." };
  }

  return {
    ok: true,
    value: {
      domain,
      slug,
      domainId: domainRow?.id ?? null,
    },
  };
}
