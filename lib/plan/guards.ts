const KNOWN_PLANS = [
  "free",
  "starter",
  "pro",
  "trial",
  "business",
  "datarooms",
  "datarooms-plus",
] as const;

export type PlanId = (typeof KNOWN_PLANS)[number];

export type FeatureKey =
  | "customDomain"
  | "datarooms"
  | "analyticsExport"
  | "advancedLinks"
  | "viewerDirectory"
  | "webhooks"
  | "linkDeletion"
  | "viewsFull";

const FEATURE_PLAN_MAP: Record<FeatureKey, PlanId[]> = {
  customDomain: ["starter", "pro", "business", "datarooms", "datarooms-plus"],
  datarooms: ["business", "datarooms", "datarooms-plus"],
  analyticsExport: ["pro", "business", "datarooms", "datarooms-plus"],
  advancedLinks: ["pro", "business", "datarooms", "datarooms-plus"],
  viewerDirectory: ["business", "datarooms", "datarooms-plus"],
  webhooks: ["business", "datarooms", "datarooms-plus"],
  linkDeletion: ["pro", "business", "datarooms", "datarooms-plus"],
  viewsFull: ["pro", "business", "datarooms", "datarooms-plus"],
};

const PAID_PLANS: PlanId[] = [
  "pro",
  "business",
  "datarooms",
  "datarooms-plus",
];

const SELF_HOSTED_PLAN: PlanId = "datarooms-plus";

type NumericLimitKey = "documents" | "links" | "users" | "domains" | "datarooms";

type LimitConfig = Partial<Record<NumericLimitKey, number | null>> | null | undefined;

function sanitizePlan(plan?: string | null) {
  return (plan || "").toLowerCase();
}

export function isSelfHosted() {
  const serverValue =
    process.env.SELF_HOSTED ?? process.env.NEXT_PUBLIC_SELF_HOSTED ?? "true";
  const clientValue =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_SELF_HOSTED ?? "true"
      : undefined;

  const flag = typeof window === "undefined" ? serverValue : clientValue;

  return flag === "true";
}

export function normalizePlan(plan?: string | null): PlanId {
  const sanitized = sanitizePlan(plan);
  const basePlan = sanitized.split("+")[0] as PlanId;
  if ((KNOWN_PLANS as readonly string[]).includes(basePlan)) {
    return basePlan;
  }
  return "free";
}

export function hasDataRoomTrial(plan?: string | null) {
  return sanitizePlan(plan).includes("drtrial");
}

export function getEffectivePlan(plan?: string | null): PlanId {
  if (isSelfHosted()) {
    return SELF_HOSTED_PLAN;
  }
  return normalizePlan(plan);
}

export function teamHasPaidPlan(plan?: string | null) {
  if (isSelfHosted()) {
    return true;
  }
  const normalized = normalizePlan(plan);
  return PAID_PLANS.includes(normalized);
}

export function teamHasFeature(plan: string | null | undefined, feature: FeatureKey) {
  if (isSelfHosted()) {
    return true;
  }
  const normalized = normalizePlan(plan);
  const allowedPlans = FEATURE_PLAN_MAP[feature];
  if (!allowedPlans) {
    return teamHasPaidPlan(plan);
  }
  return allowedPlans.includes(normalized);
}

export function teamLimit(
  usage: number,
  limitKey: NumericLimitKey,
  limits?: LimitConfig,
) {
  if (isSelfHosted()) {
    return true;
  }
  if (!limits) {
    return true;
  }
  const max = limits[limitKey];
  if (typeof max !== "number") {
    return true;
  }
  return usage < max;
}
