import { cacheLife, cacheTag, updateTag } from "next/cache";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { getInventory, getProduct, getRelated } from "./_data";
import ProductActions from "./_components/product-actions";

// Type params tường minh cho dễ port. v16 cũng có helper global `PageProps<"/store/[slug]">`.
type PageParams = { params: Promise<{ slug: string }> };

// Validate điều hướng tức thì ở dev + build (chỉ chạy khi cacheComponents bật).
// Route có param động → cấp `samples` (slug mẫu) để validator dựng được shell.
export const unstable_instant = {
  prefetch: "static",
  // Khai báo MỌI input runtime mà route đọc (params + cookies) để validator
  // dựng shell tất định. value: null = cookie vắng mặt.
  samples: [
    {
      params: { slug: "demo" },
      cookies: [{ name: "tier", value: null }],
    },
  ],
};

// generateMetadata dùng dữ liệu ĐÃ cache (getProduct) → không tốn fetch thừa.
export async function generateMetadata({
  params,
}: PageParams): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  return { title: product.name, description: product.description };
}

export default function ProductPage({ params }: PageParams) {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 p-8">
      {/* ───────────── 1) STATIC — tự vào static shell, load tức thì ───────────── */}
      <nav className="flex-y-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">
          Trang chủ
        </Link>
        <span>/</span>
        <span>Cửa hàng</span>
      </nav>

      {/* ── 2) CACHED (data-level) — phụ thuộc slug (request-time) nên bọc Suspense;
             getProduct() cache theo slug: lần đầu hiện fallback, lần sau lấy từ cache ── */}
      <Suspense fallback={<ProductInfoSkeleton />}>
        <ProductInfo params={params} />
      </Suspense>

      {/* ── 3) CACHED (ui-level) — KHÔNG phụ thuộc request-time → vào thẳng shell,
             không cần Suspense. `use cache` đặt ngay trong component. ── */}
      <RelatedProducts />

      {/* ── 4) STREAMED realtime — connection() đẩy về request-time, stream sau fallback ── */}
      <Suspense fallback={<p className="text-sm">Đang kiểm tra tồn kho…</p>}>
        <Inventory params={params} />
      </Suspense>

      {/* ── 5) STREAMED cá nhân hóa — đọc cookies() (runtime API) → phải trong Suspense ── */}
      <Suspense fallback={<p className="text-sm">Đang tải ưu đãi…</p>}>
        <UserOffer />
      </Suspense>

      {/* ───────────── 6) CLIENT ISLAND — phần tương tác + dynamic import ───────────── */}
      <ProductActions />

      {/* ───────────── 7) MUTATION — Server Action + updateTag (read-your-writes) ───────────── */}
      <Suspense fallback={null}>
        <RefreshButton params={params} />
      </Suspense>
    </main>
  );
}

/* ========================================================================== */
/* Sections                                                                    */
/* ========================================================================== */

// 2) Đọc slug (suspends) rồi lấy dữ liệu đã-cache.
async function ProductInfo({ params }: PageParams) {
  const { slug } = await params;
  const product = await getProduct(slug);
  return (
    <section>
      <h1 className="font-display text-2xl font-semibold">{product.name}</h1>
      <p className="text-brand text-xl font-medium">
        {product.price.toLocaleString("vi-VN")}₫
      </p>
      <p className="text-muted-foreground">{product.description}</p>
    </section>
  );
}

function ProductInfoSkeleton() {
  return (
    <section className="animate-pulse space-y-2">
      <div className="h-7 w-1/2 rounded bg-muted" />
      <div className="h-6 w-24 rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
    </section>
  );
}

// 3) UI-LEVEL cache: cả component được cache, đổi chậm (days).
async function RelatedProducts() {
  "use cache";
  cacheLife("days");
  cacheTag("related");

  const items = await getRelated();
  return (
    <section>
      <h2 className="mb-2 font-medium">Sản phẩm liên quan</h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((slug) => (
          <li key={slug}>
            <Link
              href={`/store/${slug}`}
              className="shadow-card rounded-md border px-3 py-1 text-sm hover:bg-accent"
            >
              {slug}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

// 4) Realtime — không cache, stream lúc request.
async function Inventory({ params }: PageParams) {
  const { slug } = await params;
  const stock = await getInventory(slug);
  return (
    <p className="text-sm">
      {stock > 0 ? `Còn ${stock} sản phẩm` : "Tạm hết hàng"}
    </p>
  );
}

// 5) Cá nhân hóa — runtime value đọc NGOÀI mọi scope cache.
async function UserOffer() {
  const tier = (await cookies()).get("tier")?.value ?? "guest";
  const discount = tier === "vip" ? 15 : 0;
  return (
    <p className="text-sm">
      {discount
        ? `Ưu đãi thành viên VIP: -${discount}%`
        : "Đăng nhập để nhận ưu đãi riêng"}
    </p>
  );
}

// 7) Mutation: action đóng gói `slug` (string serializable) rồi updateTag → visitor kế thấy fresh.
async function RefreshButton({ params }: PageParams) {
  const { slug } = await params;

  async function refresh() {
    "use server";
    updateTag(`product:${slug}`);
  }

  return (
    <form action={refresh}>
      <button
        type="submit"
        className="text-sm text-muted-foreground underline underline-offset-4"
      >
        Làm mới dữ liệu sản phẩm
      </button>
    </form>
  );
}
