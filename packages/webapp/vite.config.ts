import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import { playwright } from "@vitest/browser-playwright";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { compression } from "vite-plugin-compression2";
import pkg from "../../package.json" with { type: "json" };

export default defineConfig({
  envDir: "../../../",
  root: "src",
  build: {
    emptyOutDir: true,
    outDir: "../dist",
    target: "esnext",
    sourcemap: true,
    minify: "esbuild",
    cssMinify: "esbuild",
  },
  define: {
    "import.meta.env.APP_NAME": JSON.stringify(pkg.name),
    "import.meta.env.APP_VERSION": JSON.stringify(pkg.version),
  },
  plugins: [
    tailwindcss(),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    compression(),
    visualizer({ gzipSize: true }),
    { name: "html-transform", transformIndexHtml: (html: string) => html.replace(/%APP_NAME%/g, pkg.name).replace(/%APP_VERSION%/g, pkg.version) },
  ],
  server: {
    port: 3000,
    strictPort: true,
    allowedHosts: true,
  },
  test: {
    browser: {
      enabled: true,
      provider: playwright({
        launchOptions: {
          slowMo: 25,
          channel: "chromium",
          args: ["--auto-open-devtools-for-tabs", "--window-size=9000,9000", "--no-first-run", "--no-default-browser-check"],
        },
        actionTimeout: 1_000,
      }),
      instances: [{ browser: "chromium", headless: true, viewport: { width: 1366, height: 700 } }],
      ui: false,
      screenshotFailures: false,
    },
  },
});
