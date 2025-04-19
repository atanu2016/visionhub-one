
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Force skip loading ALL native Rollup plugins
process.env.ROLLUP_SKIP_LOAD_NATIVE_PLUGIN = "true";

// This tells Rollup directly not to load native modules
if (typeof global !== "undefined") {
  // @ts-ignore - We know this is not in the types but it's a valid workaround
  global.__ROLLUP_NO_NATIVE__ = true;
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Disable Rollup native optimizations
    rollupOptions: {
      // This forces Rollup to use pure JS implementations
      context: 'globalThis',
    },
    // Make the build more reliable in limited environments
    minify: 'terser',
    terserOptions: {
      compress: {
        // Less aggressive compression
        passes: 1,
      },
    },
  },
}));
