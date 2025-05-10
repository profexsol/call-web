import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),  // Set the root to the client folder
  publicDir: path.resolve(__dirname, '../../public'),  // Shared public folder
  resolve: {
    alias: {
      '@src': path.resolve(__dirname, '../../src'),  // Common code
      '@components': path.resolve(__dirname, '../../src/components'),  // Common components
    },
  }
});