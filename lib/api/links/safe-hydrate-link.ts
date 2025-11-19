import type { LinkWithViews } from "@/lib/types";

export type SafeHydratedLink = LinkWithViews & {
  corrupted?: boolean;
  hydrationError?: string;
};

export function createCorruptedLinkFallback<
  T extends Partial<LinkWithViews>
>(link: T, error?: unknown): SafeHydratedLink {
  const normalized = {
    ...(link as LinkWithViews),
    tags: (link as LinkWithViews).tags ?? [],
    views: (link as LinkWithViews).views ?? [],
    customFields: (link as LinkWithViews).customFields ?? [],
    feedback: (link as LinkWithViews).feedback ?? null,
    uploadFolderName: (link as LinkWithViews).uploadFolderName,
    _count: (link as LinkWithViews)._count ?? { views: 0 },
  };

  return {
    ...normalized,
    password: null,
    corrupted: true,
    hydrationError: error instanceof Error ? error.message : "Unknown error",
  };
}

export async function safeHydrateLink<
  T extends Partial<LinkWithViews>
>(
  link: T,
  hydrate: (link: T) => Promise<SafeHydratedLink>,
  fallback: (link: T, error: unknown) => SafeHydratedLink = (
    target,
    hydrationError,
  ) => createCorruptedLinkFallback(target, hydrationError),
): Promise<SafeHydratedLink> {
  try {
    return await hydrate(link);
  } catch (error) {
    console.error("Failed to hydrate link", {
      linkId: (link as LinkWithViews).id,
      error,
    });
    return fallback(link, error);
  }
}
