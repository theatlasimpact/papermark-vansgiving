import { z } from "zod";

import { isSelfHosted } from "@/lib/plan/guards";

export const configSchema = z.object({
  datarooms: z.number().optional(),
  links: z.number().optional(),
  documents: z.number().optional(),
  users: z.number().optional(),
  domains: z.number().optional(),
  customDomainOnPro: z.boolean().optional(),
  customDomainInDataroom: z.boolean().optional(),
  advancedLinkControlsOnPro: z.boolean().optional(),
  watermarkOnBusiness: z.boolean().optional(),
  agreementOnBusiness: z.boolean().optional(),
  conversationsInDataroom: z.boolean().optional(),
  fileSizeLimits: z
    .object({
      video: z.number().optional(),
      document: z.number().optional(),
      image: z.number().optional(),
      excel: z.number().optional(),
      maxFiles: z.number().optional(),
      maxPages: z.number().optional(),
    })
    .optional(),
});

const UNLIMITED = 1000000000; // effectively unlimited for self-hosted

const unlimitedLimits = {
  datarooms: UNLIMITED,
  links: UNLIMITED,
  documents: UNLIMITED,
  users: UNLIMITED,
  domains: UNLIMITED,
  customDomainOnPro: true,
  customDomainInDataroom: true,
  advancedLinkControlsOnPro: true,
  watermarkOnBusiness: true,
  agreementOnBusiness: true,
  conversationsInDataroom: true,
  fileSizeLimits: null,
  usage: {
    documents: 0,
    links: 0,
    users: 0,
  },
};

export async function getLimits(_params: { teamId: string; userId: string }) {
  if (isSelfHosted()) {
    return unlimitedLimits;
  }

  return unlimitedLimits;
}
