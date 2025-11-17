import type { NextApiRequest, NextApiResponse } from "next";

const UNLIMITED = 1000000000; // effectively unlimited for self-hosted

const UNLIMITED_LIMITS = {
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
