import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [tailwindcss()],

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "src/pages/dashboard.html"),
        inbox: resolve(__dirname, "src/pages/inbox.html"),
        compose: resolve(__dirname, "src/pages/compose.html"),
        sent: resolve(__dirname, "src/pages/sent.html"),
        employees: resolve(__dirname, "src/pages/employees.html"),
      },
    },
  },
});
