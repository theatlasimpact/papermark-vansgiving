import { Dub } from "dub";

export const dub = process.env.DUB_API_KEY
  ? new Dub({
      token: process.env.DUB_API_KEY,
    })
  : null;

export async function getDubDiscountForExternalUserId(externalId: string) {
  if (!dub) return null;
  try {
    const customers = await dub.customers.list({
      externalId,
      includeExpandedFields: true,
    });
    const first = customers[0];
    const couponId =
      process.env.NODE_ENV !== "production" && first?.discount?.couponTestId
        ? first.discount.couponTestId
        : first?.discount?.couponId;

    return couponId ? { discounts: [{ coupon: couponId }] } : null;
  } catch (err) {
    console.warn("Skipping Dub discount due to API error", err);
    return null; // degrade gracefully; don't block checkout
  }
}
