import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    environment: 'node',
    coverage: {
      include: ['src/domain/**/*.js'],
      reporter: ['text', 'html'],
    },
  },
});
