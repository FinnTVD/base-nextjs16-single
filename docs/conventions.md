# Conventions — cấu trúc & tổ chức code (base-nextjs16-single)

> Quy ước tổ chức thư mục, đặt file, và phân tầng cho base này. Đi kèm
> [`docs/performance-rules.md`](performance-rules.md) (rule render/cache/performance).

---

## 1. Cây thư mục chuẩn

```
src/
  app/                      # App Router — CHỈ chứa file định tuyến + colocation riêng route
    layout.tsx
    page.tsx
    globals.css             # Tailwind v4 CSS-first (theme/utilities/breakpoints)
    robots.ts
    global-error.tsx
    store/[slug]/           # 1 route
      page.tsx              #   entry
      _data.ts              #   data/query RIÊNG route (private)
      _components/          #   UI RIÊNG route (private, ngoài routing)
  components/
    ui/                     # shadcn primitives (vendor, shared) — eslint nới rule
    <shared>/               # component DÙNG CHUNG nhiều route
  configs/                  # hằng số cấu hình: env, endpoints, routes
  fetches/                  # lớp gọi API thô (fetchData, cf7Request, getSchemaMarkup…)
  services/                 # nghiệp vụ, gọi qua fetches (vd tourService)
  lib/                      # tiện ích lõi không gắn domain (cn…)
  utils/                    # helper thuần (scroll, parse…)
```

Nguyên tắc: **`app/` chỉ là routing + thứ riêng của từng route**. Mọi thứ tái dùng nằm trong
`src/components`, `src/lib`, `src/utils`, `src/services`, `src/fetches`, `src/configs`.

---

## 2. Đặt component ở đâu? (cây quyết định)

```
Component này có dùng ở >1 route không?
├─ KHÔNG → app/<route>/_components/   (colocate, riêng route)
└─ CÓ
   ├─ Là primitive shadcn/ui    → src/components/ui/
   └─ Là component app dùng chung → src/components/<shared>/
```

| Loại                   | Vị trí                     | Ví dụ                           |
| ---------------------- | -------------------------- | ------------------------------- |
| UI riêng 1 route       | `app/<route>/_components/` | section, card chỉ trang đó dùng |
| Dùng chung nhiều route | `src/components/`          | Header, Footer, ProductCard     |
| Primitive (shadcn)     | `src/components/ui/`       | Button, Dialog, Form            |

---

## 3. ⭐ Quy tắc vàng: "promote khi dùng chung" + chiều import

- **Bắt đầu là private** (`_components`) cho tới khi route THỨ HAI cần → lúc đó mới **promote lên `src/components`**. Đừng đoán trước.
- **Chiều import chỉ đi LÊN TRÊN:**
  - ✅ route (`app/...`) được import từ `src/components`, `src/lib`, `src/utils`, `src/services`, `src/fetches`, `src/configs`.
  - ❌ `src/components` (hoặc route khác) **KHÔNG** được import từ `app/<route>/_components/`.
  - ❌ Không import chéo `_components` của route này sang route kia → dấu hiệu cần promote.

Vi phạm chiều import = mùi code, là tín hiệu phải nâng component lên tầng dùng chung.

---

## 4. Private folders `_` và route groups `()`

- **`_folder`** (vd `_components`, `_lib`): bị **loại khỏi routing**, dùng để colocate. Là convention
  chính thức của Next — tách UI khỏi routing, tránh đụng tên với file convention tương lai.
  Colocation trong `app/` vốn an toàn (chỉ file đặc biệt như `page.tsx`/`route.ts` tạo route),
  nhưng prefix `_` làm rõ ý đồ và an toàn về lâu dài.
- **`(group)`**: gom nhóm route theo khu vực mà **KHÔNG đổi URL**. Dùng khi site lớn cần chia
  `(marketing)`, `(shop)`, `(account)`… hoặc cần nhiều root layout.

---

## 5. Phân tầng data (configs → fetches → services → page)

Luồng dữ liệu đi một chiều, mỗi tầng một việc:

```
configs/endpoints.ts   →  định nghĩa đường dẫn API
fetches/fetchData.ts   →  gọi HTTP thô (ghép ${CMS}${API}${endpoint})
services/tour/index.ts →  nghiệp vụ: getTours() gọi fetchData + endpoints
app/.../page.tsx        →  gọi service, bọc use cache/Suspense theo performance-rules
```

- Component **không** gọi `fetch` trực tiếp tới CMS → đi qua `services` (hoặc `fetches`).
- Bọc cache/stream ở tầng dùng (page/section) theo [`performance-rules.md`](performance-rules.md),
  không nhét `use cache`/`cacheLife` vào `fetches` dùng chung.
- Route-private data đặt ở `app/<route>/_data.ts`; lớn lên thì tách `app/<route>/_lib/`.

---

## 6. Naming & code style (tóm tắt)

- **Tailwind v4 CSS-first**: cấu hình trong `globals.css` (`@theme`/`@utility`/`@custom-variant`),
  KHÔNG có `tailwind.config.ts`.
- **Code style**: double quote + semicolon (mặc định Next 16). ESLint flat-config mới.
- **Import alias**: `@/*` → `src/*`.
- **Tên file**: component React `PascalCase.tsx` hoặc theo nhóm `kebab-case.tsx` (như `_components/product-actions.tsx`); helper/`utils`/`services` `camelCase.ts`.
- **Private**: prefix `_` cho folder/file không thuộc routing.

---

## 7. Khi nào tách nhỏ hơn (\_lib / features)

- Route phình to (nhiều query/logic) → tách `app/<route>/_lib/` (`queries.ts`, `types.ts`, `actions.ts`).
- Site rất lớn, nhiều tính năng độc lập → cân nhắc `src/features/<feature>/` (component + hook + data
  theo tính năng), route chỉ lắp ghép feature. (Tùy chọn, không bắt buộc cho dự án nhỏ/vừa.)

---

## 8. Checklist khi thêm file mới

- [ ] Component chỉ 1 route dùng → `_components/`; ≥2 route → `src/components/`.
- [ ] Không import từ `_components` của route khác (nếu cần → promote lên `src/components`).
- [ ] Gọi data qua `services`/`fetches`, không `fetch` thẳng trong component.
- [ ] File mới trong `app/` không vô tình tạo route ngoài ý muốn (dùng `_` nếu là code tổ chức).
- [ ] Đặt tên & style theo mục 6; chạy `npm run lint` sạch.

---

## 9. Kiểm soát rule tự động (enforcement)

Rule chia 2 nhóm: _mechanical_ (máy quét được) và _semantic_ (cần AI/người review).

### 9.1 ESLint — ép chiều import (mechanical)

`eslint.config.mjs` đã codify mục 3: mỗi tầng chỉ import xuống tầng thấp hơn, cấm `@/app/**` qua alias.
Vi phạm = **lint error**. Vd `utils` import `services` sẽ fail. Tầng phụ thuộc:

```
app → (mọi tầng)
components → services, fetches, configs, lib, utils, ui
services → fetches, configs, lib, utils
fetches → configs, lib, utils
configs / lib / utils → (leaf, không import lên trên)
```

### 9.2 Các lớp gate

| Lớp        | Lệnh / file                                                   | Chạy khi                   |
| ---------- | ------------------------------------------------------------- | -------------------------- |
| Pre-commit | `.husky/pre-commit` → `lint-staged` (eslint --fix + prettier) | mỗi `git commit`           |
| Pre-push   | `.husky/pre-push` → `npm run typecheck`                       | mỗi `git push`             |
| CI         | `npm run ci` (lint+typecheck+format:check+build)              | mỗi PR/push (không bypass) |

> **Hỗ trợ cả 2 nền tảng** (cùng gate `npm run ci`, không lệch):
>
> - GitHub → `.github/workflows/ci.yml` (Actions). Chặn merge: Settings → Branches → required status check.
> - GitLab → `.gitlab-ci.yml`. Chặn merge: Settings → Merge requests → "Pipelines must succeed".
>
> Để cả 2 file trong repo cũng không sao — mỗi nền tảng chỉ đọc file của nó.

### 9.3 Review semantic (cái lint không thấy)

ESLint **không** biết "section này nên `use cache` hay `<Suspense>`", "cacheLife đúng chưa",
"`'use client'` có thừa không". Những thứ đó để AI review theo `AGENTS.md`:

- **Local (đang dùng)**: chạy `/code-review` trong Claude Code trên diff trước khi push — nó đọc
  `AGENTS.md` → review đúng rule của base. (Hoặc `/code-review ultra` cho bản sâu hơn.)
- **Trên PR (khi lên GitHub)**: gắn Claude Code Action / CodeRabbit, trỏ vào `AGENTS.md`.
