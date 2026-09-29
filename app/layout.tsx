import { Metadata } from "next";
import { Inter } from "next/font/google";

import {
  appBaseUrl,
  BRAND_DESCRIPTION,
  BRAND_LEGAL_NAME,
  BRAND_NAME,
  ogImageUrl,
} from "@/lib/brand";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

const title = `${BRAND_NAME} | ${BRAND_LEGAL_NAME}`;
const description = BRAND_DESCRIPTION;
const image = ogImageUrl(BRAND_LEGAL_NAME);

export const metadata: Metadata = {
  metadataBase: new URL(appBaseUrl()),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: BRAND_NAME,
    images: [
      {
        url: image,
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [image],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
