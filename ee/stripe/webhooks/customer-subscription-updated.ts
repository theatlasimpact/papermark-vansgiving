import type { NextApiResponse } from "next";

const RESPONSE = {
  ok: false,
  message: "Billing disabled in self-hosted Vansgiving edition.",
};

export async function customerSubsciptionUpdated(
  _event: unknown,
  res: NextApiResponse,
  _isOldAccount: boolean = false,
) {
  return res.status(200).json(RESPONSE);
}
