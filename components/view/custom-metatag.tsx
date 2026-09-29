import Head from "next/head";

import { BRAND_NAME, ogImageUrl, viewerDescription, viewerTitle } from "@/lib/brand";

const CustomMetaTag = ({
  enableBranding,
  title,
  description,
  imageUrl,
  url,
  favicon,
}: {
  enableBranding: boolean;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  favicon: string | null;
  url: string | null;
}) => {
  const resolvedTitle =
    (enableBranding && title) || title || viewerTitle();
  const resolvedDescription =
    (enableBranding && description) ||
    description ||
    viewerDescription();
  const resolvedImage =
    (enableBranding && imageUrl) || imageUrl || ogImageUrl(resolvedTitle);

  return (
    <Head>
      {/* meta URL */}
      {url && (
        <>
          <link rel="canonical" href={url} key="canonical" />
          <meta property="og:url" content={url} key="og-url" />
        </>
      )}

      {favicon && (
        <>
          <link rel="icon" type="image/x-icon" href={favicon} key="favicon" />
          {favicon.endsWith(".ico") && (
            <link rel="icon" type="image/x-icon" href={favicon} />
          )}
          {favicon.endsWith(".png") && (
            <link rel="icon" type="image/png" href={favicon} sizes="32x32" />
          )}
          {favicon.endsWith(".svg") && (
            <link rel="icon" type="image/svg+xml" href={favicon} />
          )}
          <link rel="apple-touch-icon" href={favicon} />
        </>
      )}

      <title>{resolvedTitle}</title>
      <meta property="og:title" content={resolvedTitle} key="og-title" />
      <meta name="twitter:title" content={resolvedTitle} key="tw-title" />
      <meta name="description" content={resolvedDescription} key="description" />
      <meta
        property="og:description"
        content={resolvedDescription}
        key="og-description"
      />
      <meta
        name="twitter:description"
        content={resolvedDescription}
        key="tw-description"
      />
      <meta property="og:image" content={resolvedImage} key="og-image" />
      <meta name="twitter:image" content={resolvedImage} key="tw-image" />
      <meta property="og:site_name" content={BRAND_NAME} />
    </Head>
  );
};

export default CustomMetaTag;
