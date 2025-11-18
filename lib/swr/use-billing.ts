import { PLAN_NAME_MAP } from "@/ee/stripe/constants";
import { getEffectivePlan, isSelfHosted } from "@/lib/plan/guards";

export type BasePlan =
  | "free"
  | "starter"
  | "pro"
  | "trial"
  | "business"
  | "datarooms"
  | "datarooms-plus";

type PlanState = {
  plan: BasePlan;
  planName: string;
  originalPlan: BasePlan;
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
  isSelfHosted: boolean;
  effectivePlan: BasePlan;
};

const BASE_PLAN_STATE: PlanState = {
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
  isSelfHosted: false,
  effectivePlan: "business",
};

const mutate = async () => undefined;

function buildPlanState(): PlanState {
  const selfHosted = isSelfHosted();
  const effectivePlan = getEffectivePlan(BASE_PLAN_STATE.originalPlan);
  const planName = PLAN_NAME_MAP[effectivePlan] ?? PLAN_NAME_MAP.business;

  return {
    ...BASE_PLAN_STATE,
    plan: effectivePlan,
    planName,
    isFree: !selfHosted && effectivePlan === "free",
    isStarter: !selfHosted && effectivePlan === "starter",
    isPro: effectivePlan === "pro",
    isBusiness: effectivePlan === "business",
    isDatarooms: effectivePlan === "datarooms",
    isDataroomsPlus: effectivePlan === "datarooms-plus",
    isSelfHosted: selfHosted,
    effectivePlan,
  };
}

const PLAN_STATE = buildPlanState();

export function useBilling() {
  return {
    id: "self-hosted-team",
    plan: PLAN_STATE.plan,
    startsAt: PLAN_STATE.startsAt,
    endsAt: PLAN_STATE.endsAt,
    subscriptionId: null as string | null,
    _count: { documents: 0 },
    error: null,
    loading: false,
    isSelfHosted: PLAN_STATE.isSelfHosted,
    effectivePlan: PLAN_STATE.effectivePlan,
  };
}

export function usePlan() {
  return {
    ...PLAN_STATE,
    mutate,
  };
}
