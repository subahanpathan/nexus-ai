import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "5173";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const envDir = path.resolve(import.meta.dirname);

function resolveClerkPublishableKey(
  env: Record<string, string>,
): string | undefined {
  return (
    process.env.VITE_CLERK_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    env.VITE_CLERK_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  )?.trim();
}

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, envDir, "");
  const basePath = process.env.BASE_PATH ?? "/";
  const clerkPublishableKey = resolveClerkPublishableKey(env);

  if (mode === "production" && !clerkPublishableKey) {
    throw new Error(
      "Missing Clerk publishable key (required at Vite build time). " +
        "Set VITE_CLERK_PUBLISHABLE_KEY or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in Vercel: " +
        "Project Settings → Environment Variables (Production, Preview, Development).",
    );
  }

  return {
  base: basePath,
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  ...(clerkPublishableKey
    ? {
        define: {
          "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY":
            JSON.stringify(clerkPublishableKey),
          "import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY":
            JSON.stringify(clerkPublishableKey),
        },
      }
    : {}),
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
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
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  };
});
