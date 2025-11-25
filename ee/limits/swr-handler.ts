import { useTeam } from "@/context/team-context";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { z } from "zod";

import { usePlan } from "@/lib/swr/use-billing";
import { fetcher } from "@/lib/utils";
import { isPrivilegedAdmin } from "@/lib/utils/admin";

import { configSchema } from "./server";

export type LimitProps = z.infer<typeof configSchema> & {
  usage: {
    documents: number;
    links: number;
    users: number;
  };
  dataroomUpload: boolean;
};

const ADMIN_LIMITS: LimitProps = {
  datarooms: 1000000000,
  links: 1000000000,
  documents: 1000000000,
  users: 1000000000,
  domains: 1000000000,
  customDomainOnPro: true,
  customDomainInDataroom: true,
  advancedLinkControlsOnPro: true,
  watermarkOnBusiness: true,
  agreementOnBusiness: true,
  conversationsInDataroom: true,
  dataroomUpload: true,
  fileSizeLimits: undefined,
  usage: {
    documents: 0,
    links: 0,
    users: 0,
  },
};

export function useLimits() {
  const { data: session } = useSession();
  const teamInfo = useTeam();
  const { isFree, isTrial } = usePlan();
  const teamId = teamInfo?.currentTeam?.id;
  const isAdmin = isPrivilegedAdmin(session?.user?.email);

  const { data, error } = useSWR<LimitProps | null>(
    teamId && `/api/teams/${teamId}/limits`,
    fetcher,
    {
      dedupingInterval: 30000,
    },
  );

  const limits = isAdmin ? ADMIN_LIMITS : data || ADMIN_LIMITS;

  const canAddDocuments = limits?.documents
    ? limits?.usage?.documents < limits?.documents
    : true;
  const canAddLinks = limits?.links ? limits?.usage?.links < limits?.links : true;
  const canAddUsers = limits?.users ? limits?.usage?.users < limits?.users : true;
  const showUpgradePlanModal =
    isAdmin ? false : (isFree && !isTrial) || (isTrial && !canAddUsers);

  return {
    showUpgradePlanModal,
    limits,
    canAddDocuments: isAdmin ? true : canAddDocuments,
    canAddLinks: isAdmin ? true : canAddLinks,
    canAddUsers: isAdmin ? true : canAddUsers,
    error,
    loading: !limits && !error,
    isAdminUnlimited: isAdmin,
  };
}
