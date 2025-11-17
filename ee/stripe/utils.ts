export const PLANS = [
  {
    name: "Business",
    slug: "business",
    minQuantity: 1,
    price: {
      monthly: {
        amount: 0,
        unitPrice: 0,
        priceIds: {
          test: { old: "business", new: "business" },
          production: { old: "business", new: "business" },
        },
      },
      yearly: {
        amount: 0,
        unitPrice: 0,
        priceIds: {
          test: { old: "business", new: "business" },
          production: { old: "business", new: "business" },
        },
      },
    },
  },
];

export function getPlanFromPriceId(
  _priceId: string,
  _isOldAccount: boolean = false,
) {
  return PLANS[0];
}

export function isNewCustomer(
  _previousAttributes: Partial<Record<string, unknown>> | undefined,
) {
  return false;
}

export function isUpgradedCustomer(
  _previousAttributes: Partial<Record<string, unknown>> | undefined,
) {
  return false;
}

export const isOldAccount = (_plan: string) => {
  return false;
};
