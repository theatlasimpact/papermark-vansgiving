import { PLAN_NAME_MAP } from "@/ee/stripe/constants";

export type BasePlan =
  | "free"
  | "starter"
  | "pro"
  | "trial"
  | "business"
  | "datarooms"
  | "datarooms-plus";

type DisabledPlan = {
  plan: BasePlan;
  planName: string;
  originalPlan: string;
  trial: string | null;
  isTrial: boolean;
  isOldAccount: boolean;
  isCustomer: boolean;
  isAnnualPlan: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  cancelledAt: Date | null;
  isPaused: boolean;
  isCancelled: boolean;
  pauseStartsAt: Date | null;
  discount: null;
  isFree: boolean;
  isStarter: boolean;
  isPro: boolean;
  isBusiness: boolean;
  isDatarooms: boolean;
  isDataroomsPlus: boolean;
  loading: boolean;
  error: unknown;
};

const DEFAULT_PLAN: DisabledPlan = {
  plan: "business",
  planName: PLAN_NAME_MAP.business,
  originalPlan: "business",
  trial: null,
  isTrial: false,
  isOldAccount: false,
  isCustomer: true,
  isAnnualPlan: false,
  startsAt: null,
  endsAt: null,
  cancelledAt: null,
  isPaused: false,
  isCancelled: false,
  pauseStartsAt: null,
  discount: null,
  isFree: false,
  isStarter: false,
  isPro: false,
  isBusiness: true,
  isDatarooms: false,
  isDataroomsPlus: false,
  loading: false,
  error: null,
};

const mutate = async () => undefined;

export function useBilling() {
  return {
    id: "self-hosted-team",
    plan: DEFAULT_PLAN.plan,
    startsAt: DEFAULT_PLAN.startsAt,
    endsAt: DEFAULT_PLAN.endsAt,
    subscriptionId: null as string | null,
    _count: { documents: 0 },
    error: null,
    loading: false,
  };
}

export function usePlan() {
  return {
    ...DEFAULT_PLAN,
    mutate,
  };
}
