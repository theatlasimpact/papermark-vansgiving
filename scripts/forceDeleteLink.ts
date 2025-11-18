import "dotenv/config";
import prisma from "../lib/prisma";

async function forceDeleteLink(linkId: string) {
  const existingLink = await prisma.link.findUnique({
    where: { id: linkId },
    select: { id: true, teamId: true, slug: true },
  });

  if (!existingLink) {
    console.log(`No link found with id ${linkId}. Nothing to delete.`);
    return;
  }

  await prisma.link.delete({
    where: { id: linkId },
  });

  console.log(
    `Link ${existingLink.id} (team ${existingLink.teamId}, slug ${existingLink.slug}) was permanently deleted.`,
  );
}

async function main() {
  const linkId = process.env.LINK_ID || process.argv[2];

  if (!linkId) {
    console.error(
      "Missing LINK_ID. Pass it via the LINK_ID env var or as the first CLI argument.",
    );
    process.exitCode = 1;
    return;
  }

  try {
    await forceDeleteLink(linkId);
  } catch (error) {
    console.error(`Failed to force delete link ${linkId}.`, error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
