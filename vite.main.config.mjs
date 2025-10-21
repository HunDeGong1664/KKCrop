import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // 仅将 sharp 标记为外部依赖，pdf-lib 打进主进程 bundle
      external: ['sharp'],
      plugins: []
    }
  }
});
