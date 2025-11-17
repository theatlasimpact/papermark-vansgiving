export interface SubscriptionDiscount {
  couponId: string;
  percentOff?: number;
  amountOff?: number;
  duration: string;
  durationInMonths?: number;
  valid: boolean;
  end?: number;
}

export default async function getSubscriptionItem(
  _subscriptionId: string,
  _isOldAccount: boolean,
) {
  return {
    id: "",
    currentPeriodStart: Date.now(),
    currentPeriodEnd: Date.now(),
    discount: null as SubscriptionDiscount | null,
  };
}
