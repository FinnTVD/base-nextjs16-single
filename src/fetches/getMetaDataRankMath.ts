import type { Metadata } from "next";

import ENV from "@/configs/env";
import ENDPOINTS from "@/configs/endpoints";
import parseRankMathHead from "@/utils/parseRankMathHead";

export default async function getMetaDataRankMath(
  slug: string,
): Promise<Metadata | null> {
  try {
    const cleanSlug = slug.replace(/^\/+/, "");
    const pageUrl = `${ENV.CMS}/${cleanSlug}`;
    const res = await fetch(
      `${ENV.CMS}${ENDPOINTS.seo.rankMathHead(pageUrl)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        next: {
          revalidate: 60,
        },
      },
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!data?.success || !data?.head) return null;

    const parsed = parseRankMathHead(data.head);
    const og = parsed.openGraph;
    const tw = parsed.twitter;

    return {
      title: parsed.title,
      description: parsed.description,
      ...(parsed.canonical && {
        alternates: { canonical: parsed.canonical },
      }),
      ...(parsed.robots && { robots: parsed.robots }),
      openGraph: {
        title: og["og:title"] ?? parsed.title,
        description: og["og:description"] ?? parsed.description,
        ...(og["og:url"] && { url: og["og:url"] }),
        ...(og["og:site_name"] && { siteName: og["og:site_name"] }),
        ...(og["og:image"] && { images: [{ url: og["og:image"] }] }),
      },
      twitter: {
        card: "summary_large_image",
        title: tw["twitter:title"] ?? parsed.title,
        description: tw["twitter:description"] ?? parsed.description,
        ...(tw["twitter:image"] && { images: [tw["twitter:image"]] }),
      },
    };
  } catch {
    return null;
  }
}
