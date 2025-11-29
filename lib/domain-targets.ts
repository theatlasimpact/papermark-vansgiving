import dns from "node:dns/promises";

import { DomainConfigResponse } from "@/lib/types";

const DEFAULT_VERCEL_IPS = ["76.76.21.21"];
const STATIC_CNAME_TARGETS = buildStaticCnameTargets();

export async function domainTargetsProject(
  domain: string,
  config?: DomainConfigResponse,
) {
  if (await matchesAllowedCname(domain, config)) {
    return true;
  }

  if (await matchesVercelIp(domain)) {
    return true;
  }

  return false;
}

export async function matchesAllowedCname(
  domain: string,
  config?: DomainConfigResponse,
) {
  const acceptableCnameTargets = buildAllowedCnameTargets(config);

  if (acceptableCnameTargets.size === 0) {
    return false;
  }

  const normalizedDomain = normalizeHostname(domain);
  if (!normalizedDomain) {
    return false;
  }

  const hostnames = new Set<string>([
    normalizedDomain,
    `www.${normalizedDomain}`,
  ]);

  for (const hostname of hostnames) {
    const matches = await resolveCnameMatches(hostname, acceptableCnameTargets);
    if (matches) {
      return true;
    }
  }

  return false;
}

async function matchesVercelIp(domain: string) {
  try {
    const addresses = await dns.resolve4(domain);
    return addresses.some((addr) => DEFAULT_VERCEL_IPS.includes(addr));
  } catch (error) {
    return false;
  }
}

function buildAllowedCnameTargets(config?: DomainConfigResponse) {
  const hosts = new Set(STATIC_CNAME_TARGETS);
  const recommended = normalizeHostname(config?.recommendedCNAME);
  if (recommended) {
    hosts.add(recommended);
  }
  return hosts;
}

function buildStaticCnameTargets() {
  const hosts = new Set<string>();
  const addHost = (value?: string | null) => {
    const normalized = normalizeHostname(value);
    if (normalized) {
      hosts.add(normalized);
    }
  };

  addHost(process.env.NEXT_PUBLIC_APP_BASE_HOST);
  addHost(extractHostname(process.env.NEXT_PUBLIC_BASE_URL));
  addHost(extractHostname(process.env.NEXT_PUBLIC_MARKETING_URL));
  addHost("cname.vercel-dns.com");

  return hosts;
}

function cnameRecordMatches(record: string, allowedTargets: Set<string>) {
  const normalized = normalizeHostname(record);
  if (!normalized) {
    return false;
  }

  return (
    allowedTargets.has(normalized) || normalized.endsWith(".vercel-dns.com")
  );
}

function extractHostname(url?: string | null) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch (error) {
    return undefined;
  }
}

function normalizeHostname(hostname?: string | null) {
  if (!hostname) return undefined;
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

async function resolveCnameMatches(
  hostname: string,
  allowedTargets: Set<string>,
) {
  try {
    const records = await dns.resolveCname(hostname);
    return records.some((record) =>
      cnameRecordMatches(record, allowedTargets),
    );
  } catch (error) {
    return false;
  }
}
