import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // The browser tests opt into happy-dom per file; the rest run in Node.
    environment: "node",
    environmentOptions: {
      // A real origin, so links can be told apart as internal or outbound.
      happyDOM: { url: "https://www.example.com/services/design" },
    },
    restoreMocks: true,
    unstubGlobals: true,
  },
});
