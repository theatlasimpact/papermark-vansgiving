import { useTeam } from "@/context/team-context";
import useSWR from "swr";

import { slackIntegrationEnabled } from "@/lib/integrations/slack/flags";
import { SlackChannel } from "@/lib/integrations/slack/types";
import { fetcher } from "@/lib/utils";

export function useSlackChannels({ enabled = true }: { enabled?: boolean }) {
  const { currentTeamId: teamId } = useTeam();
  const slackEnabled = slackIntegrationEnabled;
  const { data, error, isLoading, mutate } = useSWR<{
    channels: SlackChannel[];
  }>(
    enabled && slackEnabled && teamId
      ? `/api/teams/${teamId}/integrations/slack/channels`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000,
      revalidateIfStale: false,
      errorRetryCount: 2,
      errorRetryInterval: 5000,
    },
  );

  return {
    channels: data?.channels || [],
    error,
    loading: isLoading && !data,
    mutate,
  };
}
