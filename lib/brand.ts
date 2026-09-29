/**
 * User-facing name for this self-hosted copy of Papermark.
 * The software copyright stays with Papermark, Inc. under AGPL-3.0
 * (see LICENSE). These strings are the product name shown to people
 * who open Atlas Impact links.
 */

export const BRAND_NAME = "Atlas Impact";
export const BRAND_LEGAL_NAME = "Atlas Impact Solutions";
export const BRAND_DESCRIPTION =
  "Atlas Impact Solutions shares tracked links to decks, quotes, contracts, and data rooms.";
export const BRAND_COMPANY_URL = "https://theatlasimpact.com";
export const DEFAULT_SHARE_HOST = "share.theatlasimpact.com";

/** Built-in Papermark domain. Links on it use /view/<id>, not a readable slug. */
export const LEGACY_ROOT_DOMAIN = "papermark.com";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** First URL segment that belongs to the app, not a shared document. */
export const RESERVED_SLUGS = new Set([
  "404",
  "account",
  "api",
  "auth",
  "branding",
  "dashboard",
  "datarooms",
  "documents",
  "entrance_ppreview_demo",
  "favicon.ico",
  "ingest",
  "login",
  "nav_ppreview_demo",
  "privacy",
  "register",
  "robots.txt",
  "room_ppreview_demo",
  "settings",
  "sitemap.xml",
  "terms",
  "unsubscribe",
  "verify",
  "view",
  "visitors",
  "welcome",
]);

export function hostnameFromHost(host?: string | null) {
  return (host || "").trim().split(":")[0].toLowerCase();
}

export function appBaseHost() {
  const raw =
    process.env.NEXT_PUBLIC_APP_BASE_HOST ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    DEFAULT_SHARE_HOST;

  return hostnameFromHost(raw.replace(/^https?:\/\//, "").split("/")[0]);
}

export function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (configured) return configured;
  return `https://${appBaseHost()}`;
}

export function isAppShareHost(domain?: string | null) {
  if (!domain) return false;
  const host = hostnameFromHost(domain);
  const appHost = appBaseHost();
  return host === appHost || host === `www.${appHost}`;
}

export function isLegacyRootDomain(domain?: string | null) {
  return hostnameFromHost(domain) === LEGACY_ROOT_DOMAIN;
}

export function supportsReadableSlug(domain?: string | null) {
  return Boolean(domain) && !isLegacyRootDomain(domain);
}

/** Hosts that serve the dashboard. Other hosts are link-only custom domains. */
export function isDeploymentHost(host?: string | null) {
  const hostname = hostnameFromHost(host);
  const appHost = appBaseHost();

  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".vercel.app") ||
    hostname === appHost ||
    hostname === `www.${appHost}` ||
    hostname === "papermark.com" ||
    hostname.endsWith(".papermark.com") ||
    hostname === "papermark.io" ||
    hostname.endsWith(".papermark.io")
  );
}

/**
 * Preview and local hosts do not have their own link records.
 * Look those slugs up on the configured share host.
 */
export function linkLookupDomain(requestHost: string) {
  const hostname = hostnameFromHost(requestHost);
  if (hostname === "localhost" || hostname.endsWith(".vercel.app")) {
    return appBaseHost();
  }
  return hostname;
}

export function isAppRoute(pathname: string) {
  if (!pathname || pathname === "/") return true;
  const segment = pathname.split("?")[0].split("/").filter(Boolean)[0];
  if (!segment) return true;
  if (segment.includes(".")) return true;
  return RESERVED_SLUGS.has(segment.toLowerCase());
}

export function isViewerSlugPath(pathname: string) {
  if (
    pathname.startsWith("/view/") ||
    pathname.startsWith("/verify") ||
    pathname.startsWith("/unsubscribe") ||
    pathname.startsWith("/auth/")
  ) {
    return false;
  }
  return !isAppRoute(pathname);
}

export function viewerTitle(name?: string | null) {
  const label = name?.trim();
  return label ? `${label} | ${BRAND_NAME}` : BRAND_NAME;
}

export function viewerDescription(name?: string | null) {
  const label = name?.trim();
  return label
    ? `${label}, shared securely by ${BRAND_LEGAL_NAME}.`
    : `Shared securely by ${BRAND_LEGAL_NAME}.`;
}

export function ogImageUrl(title?: string | null) {
  const value = encodeURIComponent(title?.trim() || BRAND_LEGAL_NAME);
  return `${appBaseUrl()}/api/og?title=${value}`;
}

export function emailFromAddress() {
  return (
    process.env.EMAIL_FROM ||
    `${BRAND_LEGAL_NAME} <login@${DEFAULT_SHARE_HOST}>`
  );
}

export function emailReplyToAddress() {
  return process.env.EMAIL_REPLY_TO || "van@theatlasimpact.com";
}

export function publicLinkUrl(link: {
  id: string;
  domainSlug?: string | null;
  slug?: string | null;
}) {
  if (link.domainSlug && link.slug) {
    return `https://${link.domainSlug}/${link.slug}`;
  }
  return `${appBaseUrl()}/view/${link.id}`;
}
