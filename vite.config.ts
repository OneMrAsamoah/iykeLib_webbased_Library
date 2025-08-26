import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
// import { componentTagger } from "lovable-tagger"; // Temporarily disabled

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Allow specific hosts when running on hosting providers like Render
    allowedHosts: ["iykelibrary.onrender.com"],
  
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    // Temporarily disabled: mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Improve chunking for large vendor bundles and raise warning threshold
  build: {
    // increase the warning limit slightly; still keep it reasonable
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            // Split React into its own chunk
            if (id.includes('react') || id.includes('react-dom')) return 'vendor_react';
            // UI/icon libraries
            if (id.includes('lucide-react') || id.includes('sonner')) return 'vendor_ui';
            // TanStack / react-query
            if (id.includes('@tanstack')) return 'vendor_tanstack';
            // Large misc vendors
            return 'vendor_misc';
          }
        }
      }
    }
  }
}));
