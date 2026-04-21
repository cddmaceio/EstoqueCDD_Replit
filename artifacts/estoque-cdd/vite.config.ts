import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import type { PluginOption } from "vite";

function resolvePort(rawPort: string | undefined, fallbackPort: number): number {
  if (!rawPort) {
    return fallbackPort;
  }

  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  return port;
}

async function getReplitPlugins(): Promise<PluginOption[]> {
  if (process.env.REPL_ID === undefined) {
    return [];
  }

  const [{ cartographer }, { devBanner }, { default: runtimeErrorOverlay }] =
    await Promise.all([
      import("@replit/vite-plugin-cartographer"),
      import("@replit/vite-plugin-dev-banner"),
      import("@replit/vite-plugin-runtime-error-modal"),
    ]);

  const plugins: PluginOption[] = [runtimeErrorOverlay()];

  if (process.env.NODE_ENV !== "production") {
    plugins.push(
      cartographer({
        root: path.resolve(import.meta.dirname, ".."),
      }),
      devBanner(),
    );
  }

  return plugins;
}

const port = resolvePort(process.env.PORT, 5173);
const basePath = process.env.BASE_PATH ?? "/";
const apiProxyTarget =
  process.env.VITE_DEV_API_PROXY_TARGET ?? "http://127.0.0.1:3001";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(await getReplitPlugins()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: apiProxyTarget
      ? {
          "/api": {
            target: apiProxyTarget,
            changeOrigin: true,
          },
        }
      : undefined,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
