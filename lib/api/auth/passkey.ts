import { type Session } from "next-auth";

import { getHankoConfig, getHankoTenant } from "@/lib/hanko";
import prisma from "@/lib/prisma";
import { CustomUser } from "@/lib/types";

export async function startServerPasskeyRegistration({
  session,
}: {
  session: Session;
}) {
  if (!session) throw new Error("Not logged in");

  const hanko = getHankoTenant();
  if (!hanko) {
    throw new Error("Passkey authentication is not configured.");
  }

  const sessionUser = session.user as CustomUser;

  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email as string },
    select: { id: true, name: true },
  });

  const createOptions = await hanko.registration.initialize({
    userId: user!.id,
    username: user!.name || user!.id,
  });

  return createOptions;
}

export async function finishServerPasskeyRegistration({
  credential,
  session,
}: {
  credential: any;
  session: Session;
}) {
  if (!session) throw new Error("Not logged in");

  const hanko = getHankoTenant();
  if (!hanko) {
    throw new Error("Passkey authentication is not configured.");
  }

  await hanko.registration.finalize(credential);
}

export async function listUserPasskeys({ session }: { session: Session }) {
  if (!session) throw new Error("Not logged in");

  const sessionUser = session.user as CustomUser;

  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email as string },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  const config = getHankoConfig();
  if (!config) {
    throw new Error("Passkey service configuration missing.");
  }

  const response = await fetch(
    `https://passkeys.hanko.io/${config.tenantId}/credentials?user_id=${user.id}`,
    {
      method: "GET",
      headers: {
        apiKey: config.apiKey,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to list passkeys: ${response.statusText}`);
  }

  const passkeys = await response.json();

  if (!Array.isArray(passkeys)) {
    throw new Error("Invalid passkey data received");
  }

  return passkeys;
}

export async function removeUserPasskey({
  credentialId,
  session,
}: {
  credentialId: string;
  session: Session;
}) {
  if (!session) throw new Error("Not logged in");

  const sessionUser = session.user as CustomUser;
  const user = await prisma.user.findUnique({
    where: { email: sessionUser.email as string },
    select: { id: true },
  });

  if (!user) throw new Error("User not found");

  const userPasskeys = await listUserPasskeys({ session });
  const ownsCredential = userPasskeys.some((pk: any) => pk.id === credentialId);

  if (!ownsCredential) {
    throw new Error("Unauthorized");
  }

  const config = getHankoConfig();
  if (!config) {
    throw new Error("Passkey service configuration missing.");
  }

  const isValidCredentialId = /^[a-zA-Z0-9_-]+$/.test(credentialId);
  if (!isValidCredentialId) {
    throw new Error("Invalid credential ID format");
  }

  const response = await fetch(
    `https://passkeys.hanko.io/${config.tenantId}/credentials/${credentialId}`,
    {
      method: "DELETE",
      headers: {
        apiKey: config.apiKey,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to remove passkey: ${response.statusText}`);
  }
}
