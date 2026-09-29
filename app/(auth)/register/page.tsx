import { Metadata } from "next";

import { appBaseUrl, BRAND_NAME, ogImageUrl } from "@/lib/brand";

import RegisterClient from "./page-client";

const title = `Sign up | ${BRAND_NAME}`;
const description = `Create an ${BRAND_NAME} account`;

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl()),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/register",
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

export default function RegisterPage() {
  return (
    <RegisterClient
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      )}
      linkedInEnabled={Boolean(
        process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET,
      )}
    />
  );
}
