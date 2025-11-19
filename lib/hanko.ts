import { tenant } from "@teamhanko/passkeys-next-auth-provider";

export type HankoConfig = {
  apiKey: string;
  tenantId: string;
};

type HankoTenant = ReturnType<typeof tenant>;

let cachedTenant: HankoTenant | null | undefined;
let warnedMissingConfig = false;

export function getHankoConfig(): HankoConfig | null {
  const apiKey = process.env.HANKO_API_KEY;
  const tenantId = process.env.NEXT_PUBLIC_HANKO_TENANT_ID;

  if (!apiKey || !tenantId) {
    if (!warnedMissingConfig) {
      console.warn("Hanko not configured; passkey auth is disabled.");
      warnedMissingConfig = true;
    }
    return null;
  }

  return { apiKey, tenantId };
}

export function getHankoTenant(): HankoTenant | null {
  if (cachedTenant !== undefined) {
    return cachedTenant;
  }

  const config = getHankoConfig();
  if (!config) {
    cachedTenant = null;
    return cachedTenant;
  }

  cachedTenant = tenant({
    apiKey: config.apiKey,
    tenantId: config.tenantId,
  });

  return cachedTenant;
}
