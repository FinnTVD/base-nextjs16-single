/**
 * Parse chuỗi HTML `head` mà RankMath trả về (REST `rankmath/v1/getHead`)
 * thành dữ liệu meta + JSON-LD, chạy hoàn toàn server-side (không cần DOM).
 */

export type ParsedRankMathHead = {
  title?: string;
  description?: string;
  canonical?: string;
  robots?: string;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  schemaMarkup: unknown | null;
};

function getAttr(tag: string, name: string): string | undefined {
  const match = tag.match(
    new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, "i"),
  );
  if (!match) return undefined;
  return match[2] ?? match[3];
}

function decodeEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'");
}

export default function parseRankMathHead(head: string): ParsedRankMathHead {
  const result: ParsedRankMathHead = {
    openGraph: {},
    twitter: {},
    schemaMarkup: null,
  };

  if (!head || typeof head !== "string") return result;

  // <title>
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) result.title = decodeEntities(titleMatch[1].trim());

  // <meta ...>
  const metaTags = head.match(/<meta\s+[^>]*?>/gi) ?? [];
  for (const tag of metaTags) {
    const content = getAttr(tag, "content");
    if (content == null) continue;
    const key = (
      getAttr(tag, "property") ??
      getAttr(tag, "name") ??
      ""
    ).toLowerCase();
    if (!key) continue;

    const value = decodeEntities(content);
    if (key === "description") result.description = value;
    else if (key === "robots") result.robots = value;
    else if (key.startsWith("og:")) result.openGraph[key] = value;
    else if (key.startsWith("twitter:")) result.twitter[key] = value;
  }

  // <link rel="canonical">
  const canonicalMatch = head.match(/<link[^>]*rel=["']canonical["'][^>]*>/i);
  if (canonicalMatch) result.canonical = getAttr(canonicalMatch[0], "href");

  // JSON-LD (có thể có nhiều khối <script type="application/ld+json">)
  const schemas = [
    ...head.matchAll(
      /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ]
    .map((m) => {
      try {
        return JSON.parse(m[1].trim());
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  if (schemas.length === 1) result.schemaMarkup = schemas[0];
  else if (schemas.length > 1) result.schemaMarkup = schemas;

  return result;
}
