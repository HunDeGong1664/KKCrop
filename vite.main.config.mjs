import { defineConfig } from 'vite';
import { resolve } from 'path';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // 配置rollup处理外部依赖
      external: ['sharp', 'pdf-lib'], // 将sharp和pdf-lib都标记为外部依赖，避免打包进bundle
      plugins: []
    }
  }
});
