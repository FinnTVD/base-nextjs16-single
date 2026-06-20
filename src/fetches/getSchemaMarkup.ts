import ENV from "@/configs/env";
import ENDPOINTS from "@/configs/endpoints";
import parseRankMathHead from "@/utils/parseRankMathHead";

// NOTE: Các thay thế URL dưới đây là RIÊNG của dự án okhub (domain, prefix tour/news...).
// Khi tái sử dụng base cho dự án khác, hãy chỉnh lại bảng này cho đúng.
function buildUrlReplacements(): Array<{ from: string; to: string }> {
  const { CMS, DOMAIN } = ENV;
  if (!CMS || !DOMAIN) return [];
  return [
    { from: CMS, to: DOMAIN },
    { from: `${DOMAIN}/author/ad_okhub/`, to: "https://okhub.vn/" },
    { from: `${DOMAIN}/wp-content/`, to: `${CMS}/wp-content/` },
    { from: `${DOMAIN}/cruise-tours/`, to: `${DOMAIN}/` },
    { from: `${DOMAIN}/tours/`, to: `${DOMAIN}/cruise-tours/` },
    { from: `${DOMAIN}/news/`, to: `${DOMAIN}/blog/` },
  ];
}

export default async function getSchemaMarkup(slug: string) {
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
    if (!parsed.schemaMarkup) return null;

    const replacements = buildUrlReplacements();
    if (replacements.length === 0) return parsed.schemaMarkup;

    // Áp dụng thay thế URL trên chuỗi JSON rồi parse lại
    const processed = replacements.reduce(
      (str, r) => str.replaceAll(r.from, r.to),
      JSON.stringify(parsed.schemaMarkup),
    );

    return JSON.parse(processed);
  } catch (error) {
    console.error("Error fetching schema markup:", error);
    return null;
  }
}
