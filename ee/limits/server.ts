import { z } from "zod";

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

const unlimitedLimits = {
  datarooms: Infinity,
  links: Infinity,
  documents: Infinity,
  users: Infinity,
  domains: Infinity,
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
  return unlimitedLimits;
}
