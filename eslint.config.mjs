import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Codify quy tắc "chiều import" của docs/conventions.md mục 3.
// Mỗi tầng chỉ được import XUỐNG tầng thấp hơn; cấm import code app/ qua alias @/.
const BOUNDARY_MSG =
  "Vi phạm chiều import (chỉ được phụ thuộc tầng thấp hơn). Xem docs/conventions.md mục 3.";

// Tạo nhóm pattern chặn import "lên trên" theo danh sách tầng bị cấm.
const ban = (layers) => ({
  group: layers.flatMap((l) => [`@/${l}`, `@/${l}/**`]),
  message: BOUNDARY_MSG,
});

const restrict = (layers) => ["error", { patterns: [ban(layers)] }];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Skills vendor (không phải code dự án).
    ".agents/**",
  ]),

  // Mặc định toàn src: cấm import code trong app/ qua alias @/.
  // (Trong cùng route dùng relative ./; dùng chung thì promote lên src/components.)
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app", "@/app/*", "@/app/**"],
              message:
                "Không import code trong app/ qua alias @/. Dùng relative trong cùng route, hoặc promote lên src/components.",
            },
          ],
        },
      ],
    },
  },

  // Chiều phụ thuộc giữa các tầng (rule sau ghi đè rule trên cho file khớp).
  {
    files: ["src/configs/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": restrict([
        "app",
        "services",
        "fetches",
        "components",
        "lib",
        "utils",
      ]),
    },
  },
  {
    files: ["src/lib/**/*.{ts,tsx}", "src/utils/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": restrict([
        "app",
        "services",
        "fetches",
        "components",
        "configs",
      ]),
    },
  },
  {
    files: ["src/fetches/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": restrict([
        "app",
        "services",
        "components",
      ]),
    },
  },
  {
    files: ["src/services/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-restricted-imports": restrict([
        "app",
        "components",
      ]),
    },
  },

  {
    // shadcn/ui là code vendor — nới rule lint + chỉ cho import lib/utils/ui.
    files: ["src/components/ui/**/*"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-restricted-imports": restrict([
        "app",
        "services",
        "fetches",
        "configs",
      ]),
    },
  },
]);

export default eslintConfig;
