import { defineConfig } from 'vite'

export default defineConfig(({ mode }) => {
    return {
        build: {
            outDir: "output",
            sourcemap: mode !== "production" // Only want source maps in non-prod
        },
        server: {
            port: 3000,
            strictPort: true
        }
    }
});