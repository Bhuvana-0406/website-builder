import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from "path"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },

  // optimizeDeps: {
  //   exclude: [
  //     "@daveyplate/better-auth-ui",
  //     "react-hook-form",
  //     "@hookform/resolvers/zod",
  //     "@captchafox/react",
  //     "@marsidev/react-turnstile",
  //     "input-otp"
  //   ]
  // }
})