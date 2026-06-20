import type { MetadataRoute } from "next";

const DOMAIN = process.env.NEXT_PUBLIC_DOMAIN ?? "http://localhost:3000";

/**
 * Sitemap tối thiểu. Mở rộng: gọi service lấy danh sách URL từ CMS rồi map vào mảng.
 * Nhớ chỉnh `robots.ts` (đang `disallow: "/"` để chặn index khi chưa lên prod).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: DOMAIN,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
