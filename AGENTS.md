<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

# Rules

- [`docs/conventions.md`](docs/conventions.md) — cấu trúc thư mục, đặt component (`_components` vs
  `src/components`), quy tắc "promote khi dùng chung" + chiều import, phân tầng data, naming/style.
- [`docs/performance-rules.md`](docs/performance-rules.md) — dự án bật **Cache Components**
  (`cacheComponents: true`); rule `use cache`, `cacheLife`/`cacheTag`, `<Suspense>`/PPR, `dynamic()`,
  `unstable_instant`, và anti-pattern cần tránh.

Đọc 2 file trên trước khi viết page/section.
