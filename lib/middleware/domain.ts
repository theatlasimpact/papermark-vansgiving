import { NextRequest, NextResponse } from "next/server";

export default async function DomainMiddleware(req: NextRequest) {
    const url = req.nextUrl;
  
  // For custom domains, we need to rewrite to the app
  // instead of redirecting away
  
  // Just continue with the request - let Next.js handle routing
  return NextResponse.rewrite(url);
}
