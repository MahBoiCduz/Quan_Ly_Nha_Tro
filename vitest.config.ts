import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    server: {
      deps: {
        // Allow vitest to process next-auth so our aliases apply
        inline: ["next-auth", "@auth/core"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "next/server": path.resolve(__dirname, "node_modules/next/server.js"),
      "next/headers": path.resolve(__dirname, "node_modules/next/dist/client/components/headers.js"),
      "next/navigation": path.resolve(__dirname, "node_modules/next/dist/client/components/navigation.js"),
    },
  },
});
