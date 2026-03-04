import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', '!src/**/*.spec.ts', '!src/**/*.test.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  outDir: 'dist',
  sourcemap: true,
  clean: true,
  unbundle: true,
  checks: {
    legacyCjs: false,
  },
});
