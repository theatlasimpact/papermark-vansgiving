import type { AppProps } from "next/app";
import { Inter } from "next/font/google";
import Head from "next/head";

import { TeamProvider } from "@/context/team-context";
import type { Session } from "next-auth";
import { SessionProvider } from "next-auth/react";
import PlausibleProvider from "next-plausible";
import { NuqsAdapter } from "nuqs/adapters/next/pages";

import {
  appBaseUrl,
  BRAND_DESCRIPTION,
  BRAND_LEGAL_NAME,
  BRAND_NAME,
  ogImageUrl,
} from "@/lib/brand";
import { EXCLUDED_PATHS } from "@/lib/constants";

import { PostHogCustomProvider } from "@/components/providers/posthog-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"] });

export default function App({
  Component,
  pageProps: { session, ...pageProps },
  router,
}: AppProps<{ session: Session }>) {
  return (
    <>
      <Head>
        <title>{`${BRAND_NAME} | ${BRAND_LEGAL_NAME}`}</title>
        <meta name="theme-color" content="#111827" />
        <meta name="description" content={BRAND_DESCRIPTION} key="description" />
        <meta
          property="og:title"
          content={`${BRAND_NAME} | ${BRAND_LEGAL_NAME}`}
          key="og-title"
        />
        <meta
          property="og:description"
          content={BRAND_DESCRIPTION}
          key="og-description"
        />
        <meta
          property="og:image"
          content={ogImageUrl(BRAND_LEGAL_NAME)}
          key="og-image"
        />
        <meta property="og:url" content={appBaseUrl()} key="og-url" />
        <meta property="og:site_name" content={BRAND_NAME} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          name="twitter:title"
          content={`${BRAND_NAME} | ${BRAND_LEGAL_NAME}`}
          key="tw-title"
        />
        <meta
          name="twitter:description"
          content={BRAND_DESCRIPTION}
          key="tw-description"
        />
        <meta
          name="twitter:image"
          content={ogImageUrl(BRAND_LEGAL_NAME)}
          key="tw-image"
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" key="favicon" />
      </Head>
      <SessionProvider session={session}>
        <PostHogCustomProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            <PlausibleProvider domain={BRAND_NAME} enabled={false}>
              <NuqsAdapter>
                <main className={inter.className}>
                  <Toaster closeButton />
                  <TooltipProvider delayDuration={100}>
                    {EXCLUDED_PATHS.includes(router.pathname) ? (
                      <Component {...pageProps} />
                    ) : (
                      <TeamProvider>
                        <Component {...pageProps} />
                      </TeamProvider>
                    )}
                  </TooltipProvider>
                </main>
              </NuqsAdapter>
            </PlausibleProvider>
          </ThemeProvider>
        </PostHogCustomProvider>
      </SessionProvider>
    </>
  );
}
