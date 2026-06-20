# base-nextjs16-single

Base template **Next.js 16** (App Router + React 19 + Turbopack) cho dự án WordPress-headless.

## Stack

- **Next.js 16** — Turbopack mặc định, **Cache Components** (`use cache` + PPR) bật sẵn, **React Compiler** bật sẵn.
- **React 19** · **TypeScript 5** · **Tailwind v4** (CSS-first, không có `tailwind.config.ts`).
- **shadcn/ui** (`src/components/ui`) · ESLint flat-config.

## Bắt đầu

```bash
nvm use            # Node 22 (xem .nvmrc); tối thiểu Node 20.9
npm install
cp .env.example .env   # rồi điền NEXT_PUBLIC_CMS, NEXT_PUBLIC_API...
npm run dev            # http://localhost:3000
```

Trang mẫu PPR: [`/store/abc`](http://localhost:3000/store/abc).

## Scripts

| Lệnh                   | Việc                                        |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Dev server (Turbopack)                      |
| `npm run build`        | Build production                            |
| `npm run start`        | Chạy bản build                              |
| `npm run lint`         | ESLint                                      |
| `npm run typecheck`    | `tsc --noEmit`                              |
| `npm run format`       | Prettier ghi                                |
| `npm run format:check` | Prettier kiểm tra                           |
| `npm run ci`           | lint+typecheck+format:check+build (gate CI) |

## Kiểm soát chất lượng (enforcement)

- **ESLint** ép chiều import giữa các tầng (xem [conventions.md](docs/conventions.md) mục 9) — import sai tầng = lỗi.
- **Pre-commit** (Husky + lint-staged): tự `eslint --fix` + `prettier` file staged.
- **Pre-push**: chạy `npm run typecheck`.
- **CI** (GitHub: [.github/workflows/ci.yml](.github/workflows/ci.yml) · GitLab: [.gitlab-ci.yml](.gitlab-ci.yml)): `npm run ci` mỗi PR/push — bật branch protection / "Pipelines must succeed" để chặn merge khi đỏ.
- **Review semantic** (use cache/Suspense/'use client'…): chạy `/code-review` trong Claude Code trên diff (đọc `AGENTS.md`).

## Cấu trúc

```
src/
  app/            # App Router (routing + colocation riêng route trong _components/_data)
  components/ui/  # shadcn primitives
  configs/        # env, endpoints, routes
  fetches/        # gọi API thô (fetchData, cf7Request, SEO RankMath)
  services/       # nghiệp vụ (gọi qua fetches)
  lib/ · utils/   # tiện ích
docs/
  conventions.md       # cấu trúc, đặt component, quy tắc "promote khi dùng chung"
  performance-rules.md # use cache / Suspense / dynamic / anti-patterns
```

## Quy ước quan trọng (đọc trước khi code)

- **[docs/conventions.md](docs/conventions.md)** — tổ chức thư mục & đặt file.
- **[docs/performance-rules.md](docs/performance-rules.md)** — rule render/cache/performance.
- Đã bật **React Compiler** → **không tự viết** `useMemo`/`useCallback`/`memo` trừ điểm nóng đo được.
- Code style: **double quote + semicolon** (Prettier mặc định); Tailwind cấu hình trong `src/app/globals.css`.

## Môi trường

| Biến                  | Ý nghĩa                                        |
| --------------------- | ---------------------------------------------- |
| `NEXT_PUBLIC_DOMAIN`  | Domain front-end (robots/sitemap/metadataBase) |
| `NEXT_PUBLIC_CMS`     | WordPress headless CMS                         |
| `NEXT_PUBLIC_API`     | Prefix REST API custom                         |
| `NEXT_PUBLIC_API_CF7` | Contact Form 7 REST base                       |
