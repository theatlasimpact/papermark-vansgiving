import type { NextApiRequest, NextApiResponse } from "next";

const UNLIMITED_LIMITS = {
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
  dataroomUpload: true,
  fileSizeLimits: null,
  usage: {
    documents: 0,
    links: 0,
    users: 0,
  },
};

export default async function handle(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  return res.status(200).json(UNLIMITED_LIMITS);
}
