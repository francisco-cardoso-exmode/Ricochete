import { defineConfig } from 'vite';
export default defineConfig({
 build: {
  target: 'es2022',
  rollupOptions: {output:{manualChunks:{physics:['@dimforge/rapier3d-compat'],three:['three']}}},
  // The Rapier compatibility build embeds its WASM; it is intentionally ~2 MB.
  chunkSizeWarningLimit: 2300,
 },
});
