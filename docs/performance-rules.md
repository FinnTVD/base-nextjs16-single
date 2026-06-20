# Rule code Performance — Next.js 16 (base-nextjs16-single)

> Áp dụng cho App Router + React 19 + Turbopack, bật **Cache Components** (`cacheComponents: true`).
> Mọi rule dưới đây bám theo docs trong `node_modules/next/dist/docs/` của đúng version đang cài.
> Triết lý: **ranh giới static/dynamic nằm ở mức COMPONENT, không phải ROUTE**. Một page có thể vừa có
> shell tĩnh load tức thì, vừa có phần cached, vừa có phần stream theo request.

---

## 0. Mental model (đọc trước khi code)

Khi build, mỗi component được Next xử lý theo API mà nó dùng:

| Component dùng gì                                                                             | Kết quả render                                                  |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Chỉ tính toán đồng bộ / `import` / sync I/O (deterministic)                                   | Tự vào **static shell**                                         |
| `'use cache'`                                                                                 | Kết quả được cache → vào **static shell**                       |
| Bọc trong `<Suspense>`                                                                        | Fallback vào shell, nội dung **stream** lúc request             |
| Đọc runtime API (`cookies`/`headers`/`searchParams`/`params`) mà KHÔNG cache & KHÔNG Suspense | ❌ Lỗi build `Uncached data was accessed outside of <Suspense>` |

→ Đây là **Partial Prerendering (PPR)**, mặc định khi bật Cache Components. Quy tắc vàng:
**mỗi "đảo" dữ liệu động phải hoặc được `use cache`, hoặc nằm trong `<Suspense>`.**

---

## 1. Bật Cache Components

`next.config.ts`:

```ts
const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: { instantNavigationDevToolsToggle: true }, // DevTools "Instant Navs"
};
```

Sau khi bật: `GET` Route Handler cũng theo model prerender như page.

---

## 2. RULE THEO PAGE

### 2.1 Mặc định: Server Component

- **Mọi `page.tsx`, `layout.tsx`, section đều là Server Component** trừ khi BẮT BUỘC tương tác (state, event, hook trình duyệt).
- KHÔNG đặt `'use client'` ở page/layout. Đẩy `'use client'` xuống **lá** nhỏ nhất (nút, form, slider…).

### 2.2 Cấu trúc 1 page chuẩn

```tsx
export const unstable_instant = { prefetch: "static" }; // validate điều hướng tức thì (mục 6)

export default async function Page({ params }: PageProps<"/store/[slug]">) {
  return (
    <>
      <Header /> {/* tĩnh → vào shell */}
      <ProductInfo params={params} /> {/* cached → vào shell */}
      <Suspense fallback={<InventorySkeleton />}>
        <Inventory params={params} /> {/* động/realtime → stream */}
      </Suspense>
    </>
  );
}
```

### 2.3 `params` / `searchParams` (v16: luôn là Promise — phải `await`)

- Nếu page có nhiều biến thể tĩnh → khai báo `generateStaticParams()` để prerender sẵn.
- Nếu đọc `params`/`searchParams` cho phần động → component đọc nó phải nằm trong `<Suspense>`.
- Truyền giá trị đã rút ra (vd `slug: string`) vào hàm `use cache`, **không** truyền cả Promise.

### 2.4 `generateMetadata`

- `generateMetadata`/`generateViewport` track runtime-data riêng với page. Nếu chúng đọc dữ liệu động không cache → cân nhắc model defer (xem docs `generate-metadata#with-cache-components`).
- SEO data (vd RankMath ở base này) nên đi qua `use cache` + `cacheTag` để revalidate theo CMS.

---

## 3. RULE THEO SECTION — cây quyết định

Với MỖI section/khối UI, hỏi lần lượt:

```
1) Có cần JS tương tác phía client không? (state, onClick, hover-anim, swiper…)
   → CÓ  : Client Component ('use client'); nếu nặng/không-first-view → dynamic import (mục 5)
   → KHÔNG: tiếp 2

2) Dữ liệu có đổi theo từng user/từng request không? (cookie, session, geo, realtime)
   → CÓ  : KHÔNG cache. Bọc <Suspense> để stream. Runtime value đọc NGOÀI cache, truyền vào prop.
   → KHÔNG: tiếp 3

3) Dữ liệu có cần fetch (CMS/DB/API) nhưng giống nhau cho mọi user không?
   → CÓ  : 'use cache' + cacheLife(<profile>) + cacheTag(<tag>)  → vào static shell
   → KHÔNG: tĩnh thuần → để nguyên Server Component, tự vào shell
```

| Loại section           | Cách làm                                   | Ví dụ                                     |
| ---------------------- | ------------------------------------------ | ----------------------------------------- |
| Tĩnh thuần             | Server Component, không cần gì             | Header, Footer, nội dung cứng             |
| Dữ liệu chung, fetch   | `use cache` + `cacheLife` + `cacheTag`     | Danh sách tour, bài blog, menu CMS        |
| Cá nhân hóa / realtime | `<Suspense>` + đọc `cookies()` ngoài cache | Giỏ hàng, "Xin chào {user}", tồn kho live |
| Tương tác client       | `'use client'` ở lá; dynamic nếu nặng      | Slider, modal, form, map                  |

---

## 4. `use cache` — chi tiết

### 4.1 Hai mức dùng

```ts
// DATA-LEVEL: cache hàm lấy dữ liệu (tái dùng nhiều nơi, cache tách khỏi UI)
export async function getTours() {
  "use cache";
  cacheLife("hours");
  cacheTag("tours");
  return fetchData({ api: ENDPOINTS.tour.list });
}

// UI-LEVEL: cache cả component/section
async function TourList() {
  "use cache";
  cacheLife("hours");
  cacheTag("tours");
  const tours = await getTours();
  return <Grid items={tours} />;
}
```

### 4.2 Cache key (tự sinh) gồm:

Build ID + Function ID + **arguments serializable** + **biến closure** (tự capture). → input khác nhau ⇒ entry khác nhau (dùng cho nội dung tham số hóa/cá nhân hóa có chủ đích).

### 4.3 Serialization — BẮT BUỘC nhớ

- **Arguments** (RSC serialization, chặt hơn): primitive, plain object, array, `Date/Map/Set/TypedArray/ArrayBuffer`, React element (chỉ pass-through).
- **Return**: như trên + được phép trả JSX.
- **KHÔNG hợp lệ**: class instance, function (trừ pass-through), `Symbol`, `WeakMap/WeakSet`, `URL` instance.
- **Pass-through**: được nhận `children`/Server Action không-serializable miễn **không đọc/biến đổi** chúng (chỉ truyền tiếp).

### 4.4 Cấm trong scope `use cache`

- KHÔNG gọi `cookies()`, `headers()`, `searchParams` bên trong. → Đọc NGOÀI, truyền vào làm tham số:

```tsx
async function ProfileContent() {
  // không cache
  const session = (await cookies()).get("session")?.value;
  return <CachedContent sessionId={session} />;
}
async function CachedContent({ sessionId }: { sessionId: string }) {
  "use cache"; // sessionId là 1 phần cache key
  return <div>{await fetchUserData(sessionId)}</div>;
}
```

---

## 5. `cacheLife` / `cacheTag` / invalidation

### 5.1 Profile (chọn theo tần suất đổi)

| Profile   | Dùng cho                        |
| --------- | ------------------------------- |
| `seconds` | realtime (giá CK, tỉ số)        |
| `minutes` | feed, tin tức                   |
| `hours`   | tồn kho, thời tiết, danh mục sp |
| `days`    | blog, bài viết                  |
| `weeks`   | podcast, newsletter             |
| `max`     | trang pháp lý, nội dung lưu trữ |

- 3 mốc thời gian: `stale` (client xài cache không hỏi server) · `revalidate` (server refresh nền) · `expire` (hết hạn cứng, request kế chờ fresh). `expire` > `revalidate`.
- **Luôn gọi `cacheLife` rõ ràng** trong CHÍNH hàm cache đó; đừng bọc vào util dùng chung. Mỗi lần chạy chỉ 1 lời gọi `cacheLife`.

### 5.2 Xóa cache theo tag

- `updateTag(tag)` — **chỉ trong Server Action**, read-your-own-writes: hết hạn ngay, request kế chờ fresh (user thấy thay đổi tức thì).
- `revalidateTag(tag)` — khi chấp nhận serve stale + refresh nền, hoặc gọi từ Route Handler.
- `fetch(url, { next: { tags: ["posts"] } })` cũng gắn tag được.

```tsx
async function createPost(formData: FormData) {
  "use server";
  await db.post.create({ data: { title: formData.get("title") } });
  updateTag("posts"); // visitor kế thấy bài mới ngay
}
```

---

## 6. Điều hướng tức thì (instant navigation)

- `export const unstable_instant = { prefetch: "static" }` ở route cần navigate tức thì → Next **validate ở dev + build** rằng shell tĩnh sinh ra ở mọi entry point. Sai chỗ Suspense sẽ báo lỗi kèm gợi ý.
- Chỉ hoạt động khi bật `cacheComponents`; KHÔNG đặt trong Client Component.
- **Route có param động / đọc cookie phải khai báo `samples`** (mọi `params` + `cookies` route đọc), nếu không build lỗi `INSTANT_VALIDATION_ERROR`:
  ```ts
  export const unstable_instant = {
    prefetch: "static",
    samples: [
      { params: { slug: "demo" }, cookies: [{ name: "tier", value: null }] },
    ],
  };
  ```
  (`value: null` = cookie vắng mặt). Dùng `unstable_instant = false` để miễn validate 1 segment.
- **Vị trí `<Suspense>` quan trọng**: client navigation chỉ re-render phần DƯỚI layout chung của route nguồn↔đích. Suspense ở root layout KHÔNG bao phủ điều hướng giữa 2 route cùng layout con → đặt boundary đúng tầng.
- Debug: bật `experimental.instantNavigationDevToolsToggle` → DevTools › **Instant Navs**.

---

## 7. Dynamic import / lazy load (`next/dynamic`)

> Lazy load **chỉ áp dụng cho Client Component & thư viện client**. Server Component đã tự code-split.

### 7.1 Khi nào DÙNG

- Component client **nặng** và **không thuộc first view**: modal, drawer, lightbox, chart, map, editor, swiper dưới màn hình đầu.
- Thư viện lớn chỉ cần khi tương tác: load bằng `await import()` trong handler.

```tsx
"use client";
import dynamic from "next/dynamic";

const Modal = dynamic(() => import("@/components/Modal")); // tách bundle
const Chart = dynamic(() => import("@/components/Chart"), {
  // có skeleton
  loading: () => <ChartSkeleton />,
});
const MapNoSSR = dynamic(() => import("@/components/Map"), { ssr: false }); // chỉ client
```

```tsx
// thư viện nặng load theo tương tác
onChange={async (e) => {
  const Fuse = (await import("fuse.js")).default;
  /* ... */
}}
```

### 7.2 Lưu ý

- `ssr: false` **chỉ dùng trong Client Component** (đặt trong Server Component sẽ lỗi).
- Dynamic-import một **Server Component** chỉ lazy phần Client con của nó, không lazy chính nó.
- Đừng lạm dụng: component nhỏ/đang ở first view mà dynamic → thêm round-trip, hại nhiều hơn lợi.

---

## 8. Ranh giới Client/Server

- `'use client'` đặt ở **lá nhỏ nhất**. Mọi thứ import vào file client trở thành client bundle.
- Pattern: Server Component fetch + truyền data xuống Client Component qua **props**; hoặc nhét động vào cached component qua **`children`** (pass-through).
- Đừng biến cả cây thành client chỉ vì 1 nút. Tách nút đó ra.
- `Context Provider` to ở root layout buộc subtree thành client → cân nhắc đặt provider ở tầng thấp nhất cần thiết.

### React Compiler (đã bật `reactCompiler: true`)

- Compiler **tự memoize** component/hook → **KHÔNG viết tay** `useMemo`/`useCallback`/`React.memo`.
- Chỉ memo thủ công cho **điểm nóng đã đo** hoặc khi cần ổn định reference cho thư viện ngoài React.
- Vẫn giữ code "pure" theo Rules of React (không mutate props/state) để compiler tối ưu được.

---

## 9. Ảnh / Font / Script

- **Ảnh**: luôn `next/image` (đã cấu hình `image/webp` + `remotePatterns`). Bắt buộc `width`/`height` (hoặc `fill`) để tránh CLS. `priority` cho ảnh **LCP** (hero). KHÔNG dùng `<img>` (eslint `@next/next/no-img-element` đã bật ở các dự án anh em).
- **Font**: `next/font` (đã dùng Geist). Tránh `@import` font ngoài / `<link>` font custom (eslint `no-page-custom-font`). Map biến font qua `@theme inline` (xem `globals.css`).
- **Script bên thứ 3**: `next/script` với `strategy`: `afterInteractive` (mặc định), `lazyOnload` (chat, analytics phụ). Tránh chèn `<script>` đồng bộ trong `<head>`.

---

## 10. ❌ NHỮNG ĐIỀU CẦN TRÁNH (anti-pattern)

**Rendering / boundary**

- ❌ `'use client'` trên page/layout không cần tương tác → mất lợi ích RSC, ship JS thừa, cả subtree thành client.
- ❌ Đọc `cookies()`/`headers()` ở đầu page mà không Suspense → (Cache Components) **lỗi build**; (không bật) cả route thành dynamic.
- ❌ Quên `<Suspense>` quanh khối động → cả page bị block / lỗi `Uncached data outside <Suspense>`.
- ❌ Đặt `<Suspense fallback={null}>` bao quanh `<body>` ở root layout → **tắt static shell toàn app**, mọi request phải chờ render xong. Chỉ làm khi cố ý.

**Caching**

- ❌ `use cache` cho dữ liệu cá nhân hóa mà không truyền key user → **rò rỉ data giữa user**.
- ❌ Truyền class instance / function / `URL` vào hàm `use cache` → lỗi serialize.
- ❌ Quên `cacheLife` → rơi về profile `default` (stale 5m / revalidate 15m) có thể sai mong đợi.
- ❌ Cache dữ liệu realtime (giỏ hàng, tồn kho live) → user thấy số liệu cũ.
- ❌ Dựa vào in-memory cache trên serverless (không persist giữa request) → cần `use cache: remote` nếu muốn cache runtime bền.
- ❌ `cacheLife`/`cacheTag` nhét vào util dùng chung → khó suy luận; giữ ngay trong hàm cache.

**Data fetching**

- ❌ Fetch trong `useEffect` ở client cho data lẽ ra fetch được ở server → thêm round-trip, hại LCP/SEO.
- ❌ `await` tuần tự nhiều nguồn (waterfall) → dùng `Promise.all` chạy song song.
- ❌ Truyền cả `Promise params` vào hàm cache → rút giá trị ra trước rồi truyền.

**Bundle / client**

- ❌ Import cả thư viện lớn ở đầu Client Component (lodash full, moment, icon set khổng lồ) → import lẻ / `await import()` theo nhu cầu.
- ❌ Barrel file `index.ts` re-export hàng loạt vào client → kéo theo code không dùng.
- ❌ Dynamic import lung tung cả component nhỏ ở first view → tăng request, nhấp nháy.

**v16 breaking cần nhớ**

- ❌ Truy cập **đồng bộ** `cookies()/headers()/draftMode()/params/searchParams` → v16 phải `await` (bỏ sync hoàn toàn).
- ❌ Còn `experimental_ppr`, `--turbopack` thủ công, `next lint`, `middleware` convention cũ → v16 đổi: Turbopack mặc định, dùng ESLint CLI, đổi `middleware`→`proxy`, bỏ prefix `unstable_` cho API đã ổn định.

---

## 11. Checklist nhanh trước khi commit 1 page

- [ ] Page/layout là Server Component; `'use client'` chỉ ở lá.
- [ ] Mỗi khối động đã có `use cache` HOẶC nằm trong `<Suspense>`.
- [ ] Hàm `use cache` có `cacheLife(profile)` + `cacheTag(tag)` đúng tần suất đổi.
- [ ] Runtime API (`cookies/headers/params/searchParams`) đều `await` và đọc NGOÀI scope cache.
- [ ] Component client nặng/dưới màn đầu đã `dynamic()`; `ssr:false` chỉ trong client.
- [ ] Ảnh dùng `next/image` có `width/height`, ảnh LCP có `priority`.
- [ ] Mutation gọi `updateTag`/`revalidateTag` đúng tag.
- [ ] Route cần điều hướng tức thì có `export const unstable_instant`, build không cảnh báo.
- [ ] `npm run build` log mỗi route đúng kỳ vọng (○ Static / ƒ Dynamic / shell PPR).
