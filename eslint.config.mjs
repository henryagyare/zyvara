import { defineConfig, globalIgnores } from "eslint/config";
import next from "eslint-config-next/core-web-vitals";
import ts from "eslint-config-next/typescript";
export default defineConfig([
  ...next,
  ...ts,
  globalIgnores([
    ".next/**",
    ".next-e2e/**",
    ".pnpm-store/**",
    ".data/**",
    "test-results/**",
    "playwright-report/**",
    "design-system/**",
    "next-env.d.ts",
  ]),
  { rules: { "@next/next/no-img-element": "off" } },
]);
