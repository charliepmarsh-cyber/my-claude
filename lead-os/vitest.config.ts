import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: [
      // Next.js server-module stubs so the real service/action layer runs under vitest.
      { find: "server-only", replacement: path.resolve(__dirname, "tests/stubs/empty.ts") },
      { find: "next/cache", replacement: path.resolve(__dirname, "tests/stubs/next-cache.ts") },
      { find: "next/navigation", replacement: path.resolve(__dirname, "tests/stubs/next-navigation.ts") },
      { find: "next/headers", replacement: path.resolve(__dirname, "tests/stubs/next-headers.ts") },
      { find: "@/lib/auth", replacement: path.resolve(__dirname, "tests/stubs/auth.ts") },
      { find: "@", replacement: path.resolve(__dirname, "src") },
    ],
  },
});
