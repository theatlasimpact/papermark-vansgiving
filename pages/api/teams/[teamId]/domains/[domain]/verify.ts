import dns from "node:dns/promises";

import { NextApiRequest, NextApiResponse } from "next";

import { waitUntil } from "@vercel/functions";

import { trackAnalytics } from "@/lib/analytics";
import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "@/lib/domains";
import prisma from "@/lib/prisma";
import { DomainVerificationStatusProps } from "@/lib/types";
import { log } from "@/lib/utils";

const DEFAULT_VERCEL_IPS = ["76.76.21.21"];
const ACCEPTABLE_CNAME_TARGETS = buildAllowedCnameTargets();

function buildAllowedCnameTargets() {
  const hosts = new Set<string>();
  const addHost = (value?: string | null) => {
    if (!value) return;
    hosts.add(value.toLowerCase());
  };

  addHost(process.env.NEXT_PUBLIC_APP_BASE_HOST);
  addHost(extractHostname(process.env.NEXT_PUBLIC_BASE_URL));
  addHost(extractHostname(process.env.NEXT_PUBLIC_MARKETING_URL));
  addHost("cname.vercel-dns.com");

  return Array.from(hosts);
}

function extractHostname(url?: string | null) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname;
  } catch (error) {
    return undefined;
  }
}

async function domainTargetsProject(domain: string) {
  if (await matchesAllowedCname(domain)) {
    return true;
  }

  if (await matchesVercelIp(domain)) {
    return true;
  }

  return false;
}

async function matchesAllowedCname(domain: string) {
  if (ACCEPTABLE_CNAME_TARGETS.length === 0) {
    return false;
  }

  try {
    const records = await dns.resolveCname(domain);
    return records.some((record) =>
      ACCEPTABLE_CNAME_TARGETS.includes(record.toLowerCase()),
    );
  } catch (error) {
    return false;
  }
}

async function matchesVercelIp(domain: string) {
  try {
    const addresses = await dns.resolve4(domain);
    return addresses.some((addr) => DEFAULT_VERCEL_IPS.includes(addr));
  } catch (error) {
    return false;
  }
}

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // GET /api/teams/:teamId/domains/[domain]/verify - get domain verification status
  if (req.method === "GET") {
    const { domain } = req.query as { domain: string };
    let status: DomainVerificationStatusProps = "Valid Configuration";

    const [domainJson, configJson] = await Promise.all([
      getDomainResponse(domain),
      getConfigResponse(domain),
    ]);

    if (domainJson?.error?.code === "not_found") {
      // domain not found on Vercel project
      status = "Domain Not Found";
      return res.status(200).json({
        status,
        response: { domainJson, configJson },
      });
      // unknown error
    } else if (domainJson.error) {
      status = "Unknown Error";
      return res.status(200).json({
        status,
        response: { domainJson, configJson },
      });
    }

    /**
     * Domain has DNS conflicts
     */
    if (configJson?.conflicts.length > 0) {
      status = "Conflicting DNS Records";
      return res.status(200).json({
        status,
        response: { domainJson, configJson },
      });
    }

    /**
     * If domain is not verified, we try to verify now
     */
    if (!domainJson.verified) {
      status = "Pending Verification";
      const verificationJson = await verifyDomain(domain);

      // domain was just verified
      if (verificationJson && verificationJson.verified) {
        status = "Valid Configuration";
      }

      return res.status(200).json({
        status,
        response: { domainJson, configJson },
      });
    }

    const isDnsAligned = configJson.misconfigured
      ? await domainTargetsProject(domain)
      : true;

    if (isDnsAligned) {
      status = "Valid Configuration";
      const currentDomain = await prisma.domain.findUnique({
        where: {
          slug: domain,
        },
        select: {
          verified: true,
        },
      });

      const updatedDomain = await prisma.domain.update({
        where: {
          slug: domain,
        },
        data: {
          verified: true,
          lastChecked: new Date(),
        },
        select: {
          userId: true,
          verified: true,
        },
      });

      if (configJson.misconfigured && isDnsAligned) {
        await log({
          message: `Domain ${domain} marked as valid via DNS override despite Vercel misconfiguration warning.`,
          type: "info",
        });
      }

      if (!currentDomain?.verified && updatedDomain.verified) {
        waitUntil(trackAnalytics({ event: "Domain Verified", slug: domain }));
      }
    } else {
      status = "Invalid Configuration";
      await prisma.domain.update({
        where: {
          slug: domain,
        },
        data: {
          verified: false,
          lastChecked: new Date(),
        },
      });
    }

    return res.status(200).json({
      status,
      response: { domainJson, configJson },
    });
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
