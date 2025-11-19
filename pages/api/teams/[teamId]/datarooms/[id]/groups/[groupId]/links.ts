import { NextApiRequest, NextApiResponse } from "next";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

import { errorhandler } from "@/lib/errorHandler";
import prisma from "@/lib/prisma";
import { CustomUser, LinkWithViews } from "@/lib/types";
import { decryptEncrpytedPassword, log } from "@/lib/utils";
import { safeHydrateLink } from "@/lib/api/links/safe-hydrate-link";

export default async function handle(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    // GET /api/teams/:teamId/datarooms/:id/groups/:groupId/links
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).end("Unauthorized");
    }

    const {
      teamId,
      id: dataroomId,
      groupId,
    } = req.query as {
      teamId: string;
      id: string;
      groupId: string;
    };
    const userId = (session.user as CustomUser).id;

    try {
      const team = await prisma.team.findUnique({
        where: {
          id: teamId,
          users: {
            some: {
              userId: (session.user as CustomUser).id,
            },
          },
        },
        select: {
          id: true,
        },
      });

      if (!team) {
        return res.status(403).end("Unauthorized to access this team");
      }

      let links = await prisma.link.findMany({
        where: {
          groupId: groupId,
          dataroomId: dataroomId,
          linkType: "DATAROOM_LINK",
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        include: {
          views: {
            where: {
              viewType: "DATAROOM_VIEW",
            },
            orderBy: {
              viewedAt: "desc",
            },
            take: 1,
          },
          customFields: true,
          _count: {
            select: { views: { where: { viewType: "DATAROOM_VIEW" } } },
          },
        },
      });

      let extendedLinks: LinkWithViews[] = links as LinkWithViews[];
      if (extendedLinks && extendedLinks.length > 0) {
        extendedLinks = await Promise.all(
          extendedLinks.map((link) =>
            safeHydrateLink(link, async (hydrationTarget) => {
              const hydratedLink = { ...hydrationTarget };

              if (hydratedLink.password !== null) {
                try {
                  hydratedLink.password = decryptEncrpytedPassword(
                    hydratedLink.password,
                  );
                } catch (decryptError) {
                  hydratedLink.password = null;
                  await log({
                    message: `Failed to decrypt password for link ${hydratedLink.id}: ${decryptError}`,
                    type: "error",
                  });
                }
              }

              if (hydratedLink.enableUpload && hydratedLink.uploadFolderId !== null) {
                try {
                  const folder = await prisma.dataroomFolder.findUnique({
                    where: {
                      id: hydratedLink.uploadFolderId,
                    },
                    select: {
                      name: true,
                    },
                  });
                  hydratedLink.uploadFolderName = folder?.name;
                } catch (folderError) {
                  await log({
                    message: `Failed to fetch upload folder for link ${hydratedLink.id}: ${folderError}`,
                    type: "error",
                  });
                }
              }

              let tags = [] as {
                id: string;
                name: string;
                color: string;
                description: string | null;
              }[];

              try {
                const rawTags = await prisma.tag.findMany({
                  where: {
                    items: {
                      some: {
                        linkId: hydratedLink.id,
                        itemType: "LINK_TAG",
                      },
                    },
                  },
                  select: {
                    id: true,
                    name: true,
                    color: true,
                    description: true,
                  },
                });
                tags = rawTags.map((tag) => ({
                  ...tag,
                  color: tag.color ?? "#6b7280",
                }));
              } catch (tagError) {
                await log({
                  message: `Failed to fetch tags for link ${hydratedLink.id}: ${tagError}`,
                  type: "error",
                });
              }

              return {
                ...hydratedLink,
                tags,
              };
            }),
          ),
        );
      }

      return res.status(200).json(extendedLinks);
    } catch (error) {
      log({
        message: `Failed to get links for dataroom: _${dataroomId}_,group: _${groupId}_. \n\n ${error} \n\n*Metadata*: \`{teamId: ${teamId}, groupId: ${groupId}, userId: ${userId}}\``,
        type: "error",
      });
      errorhandler(error, res);
    }
  } else {
    // We only allow GET requests
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
