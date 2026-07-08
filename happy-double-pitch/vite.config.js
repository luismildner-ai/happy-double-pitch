import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // react-three-fiber runs its own React reconciler. Without deduping, Vite's
  // dep pre-bundling can hand r3f a second copy of React and hooks throw
  // "Invalid hook call". Force a single instance.
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei'],
  },
})
