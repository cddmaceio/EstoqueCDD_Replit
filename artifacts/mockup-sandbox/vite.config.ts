import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin";
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

  const [{ cartographer }, { default: runtimeErrorOverlay }] =
    await Promise.all([
      import("@replit/vite-plugin-cartographer"),
      import("@replit/vite-plugin-runtime-error-modal"),
    ]);

  const plugins: PluginOption[] = [runtimeErrorOverlay()];

  if (process.env.NODE_ENV !== "production") {
    plugins.push(
      cartographer({
        root: path.resolve(import.meta.dirname, ".."),
      }),
    );
  }

  return plugins;
}

const port = resolvePort(process.env.PORT, 5174);
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [
    mockupPreviewPlugin(),
    react(),
    tailwindcss(),
    ...(await getReplitPlugins()),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
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
