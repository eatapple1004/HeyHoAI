import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 도피아 사업체 진단 리포트 화면 — 빌드 결과는 ../public/report-app 으로(도피아 서버가 그대로 서빙)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/report-app/',
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: { outDir: '../public/report-app', emptyOutDir: true },
});
