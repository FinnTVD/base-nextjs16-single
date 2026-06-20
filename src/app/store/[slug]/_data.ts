import { cacheLife, cacheTag } from "next/cache";
import { connection } from "next/server";

export type Product = {
  slug: string;
  name: string;
  price: number;
  description: string;
};

/**
 * DATA-LEVEL cache — dữ liệu chung cho mọi user, revalidate theo giờ.
 * Khi nối CMS thật: thay phần thân bằng `await fetchData({ api: ENDPOINTS... })`.
 * Cache key tự gồm `slug` (argument) → mỗi sản phẩm 1 entry.
 */
export async function getProduct(slug: string): Promise<Product> {
  "use cache";
  cacheLife("hours");
  cacheTag(`product:${slug}`);

  // mock: giả lập fetch CMS (đồng bộ, deterministic)
  return {
    slug,
    name: `Sản phẩm ${slug.toUpperCase()}`,
    price: 1_990_000,
    description: "Mô tả lấy từ CMS — đã cache, nằm trong static shell.",
  };
}

/** mock: danh sách liên quan (đổi chậm) — dùng cho UI-level cache ở page. */
export async function getRelated(): Promise<string[]> {
  return ["ao-thun", "quan-jean", "giay-sneaker"];
}

/**
 * Dữ liệu REALTIME — gọi `connection()` để defer tới request-time,
 * nhờ vậy KHÔNG bị prerender vào shell mà stream sau <Suspense>.
 */
export async function getInventory(slug: string): Promise<number> {
  await connection();
  // mock: số tồn "live"
  return (slug.length * 7) % 25;
}
