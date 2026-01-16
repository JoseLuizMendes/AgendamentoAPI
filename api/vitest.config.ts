import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
    reporters: ["default"],
    coverage: {
      provider: "v8",
      enabled: false,
      reporter: ["text", "html"],
      reportsDirectory: "./coverage",
      exclude: ["dist/**", "prisma/**"],
    },
  },
});
