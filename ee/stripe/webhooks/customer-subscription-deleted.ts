import type { NextApiResponse } from "next";

const RESPONSE = {
  ok: false,
  message: "Billing disabled in self-hosted Vansgiving edition.",
};

export async function customerSubscriptionDeleted(
  _event: unknown,
  res: NextApiResponse,
) {
  return res.status(200).json(RESPONSE);
}
