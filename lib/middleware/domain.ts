import { NextRequest, NextResponse } from "next/server";

import { BLOCKED_PATHNAMES } from "@/lib/constants";

export default async function DomainMiddleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const host = req.headers.get("host") ?? "";

  const url = req.nextUrl.clone();

  // Return 404 for blocked pathnames or file-like paths on custom domains
  if (BLOCKED_PATHNAMES.includes(path) || path.includes(".")) {
    url.pathname = "/404";
    return NextResponse.rewrite(url, { status: 404 });
  }

  // Rewrite to the pages/view/domains/[domain]/[slug] route
  const targetPath = path === "/" ? "/404" : path;
  url.pathname = `/view/domains/${host}${targetPath}`;

  return NextResponse.rewrite(url, {
    headers: {
      "X-Robots-Tag": "noindex",
      "X-Powered-By":
        "Papermark - Secure Data Room Infrastructure for the modern web",
    },
  });
}
