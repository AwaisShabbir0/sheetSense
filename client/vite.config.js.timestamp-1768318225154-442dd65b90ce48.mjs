// vite.config.js
import mkcert from "file:///D:/sheetSense/client/node_modules/vite-plugin-mkcert/dist/mkcert.mjs";
var __vite_injected_original_dirname = "D:\\sheetSense\\client";
var vite_config_default = defineConfig({
  plugins: [react(), mkcert()],
  server: {
    port: 5173,
    https: true,
    headers: {
      "Permissions-Policy": 'microphone=(self "https://localhost:4173" "https://localhost:5173")'
    }
  },
  preview: {
    port: 4173,
    https: true,
    headers: {
      "Permissions-Policy": 'microphone=(self "https://localhost:4173" "https://localhost:5173")'
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxzaGVldFNlbnNlXFxcXGNsaWVudFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiRDpcXFxcc2hlZXRTZW5zZVxcXFxjbGllbnRcXFxcdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL0Q6L3NoZWV0U2Vuc2UvY2xpZW50L3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IG1rY2VydCBmcm9tICd2aXRlLXBsdWdpbi1ta2NlcnQnXHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtyZWFjdCgpLCBta2NlcnQoKV0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgaHR0cHM6IHRydWUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgIFwiUGVybWlzc2lvbnMtUG9saWN5XCI6IFwibWljcm9waG9uZT0oc2VsZiBcXFwiaHR0cHM6Ly9sb2NhbGhvc3Q6NDE3M1xcXCIgXFxcImh0dHBzOi8vbG9jYWxob3N0OjUxNzNcXFwiKVwiXHJcbiAgICB9XHJcbiAgfSxcclxuICBwcmV2aWV3OiB7XHJcbiAgICBwb3J0OiA0MTczLFxyXG4gICAgaHR0cHM6IHRydWUsXHJcbiAgICBoZWFkZXJzOiB7XHJcbiAgICAgIFwiUGVybWlzc2lvbnMtUG9saWN5XCI6IFwibWljcm9waG9uZT0oc2VsZiBcXFwiaHR0cHM6Ly9sb2NhbGhvc3Q6NDE3M1xcXCIgXFxcImh0dHBzOi8vbG9jYWxob3N0OjUxNzNcXFwiKVwiXHJcbiAgICB9XHJcbiAgfSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG4gICAgfSxcclxuICB9LFxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW9QLE9BQU8sWUFBWTtBQUF2USxJQUFNLG1DQUFtQztBQUd6QyxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQztBQUFBLEVBQzNCLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxJQUNQLFNBQVM7QUFBQSxNQUNQLHNCQUFzQjtBQUFBLElBQ3hCO0FBQUEsRUFDRjtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ04sT0FBTztBQUFBLElBQ1AsU0FBUztBQUFBLE1BQ1Asc0JBQXNCO0FBQUEsSUFDeEI7QUFBQSxFQUNGO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
