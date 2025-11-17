import type { NextApiRequest, NextApiResponse } from "next";

const BILLING_DISABLED_RESPONSE = {
  ok: false,
  message: "Billing disabled in self-hosted Vansgiving edition.",
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.status(200).json(BILLING_DISABLED_RESPONSE);
}

