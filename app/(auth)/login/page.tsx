import { Metadata } from "next";

import { appBaseUrl, BRAND_NAME, ogImageUrl } from "@/lib/brand";

import { GTMComponent } from "@/components/gtm-component";

import LoginClient from "./page-client";

const title = `Login | ${BRAND_NAME}`;
const description = `Sign in to ${BRAND_NAME}`;

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl()),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/login",
    siteName: BRAND_NAME,
    images: [{ url: ogImageUrl(title), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImageUrl(title)],
  },
};

export default function LoginPage() {
  return (
    <>
      <GTMComponent />
      <LoginClient
        googleEnabled={Boolean(
          process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
        )}
        linkedInEnabled={Boolean(
          process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET,
        )}
      />
    </>
  );
}
