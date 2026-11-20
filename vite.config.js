import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// `npm run dev:https` (modo "https") levanta el servidor con HTTPS local
// (certificado autofirmado) y visible en la red, para usar la cámara desde un celular.
export default defineConfig(({ mode }) => {
  const conHttps = mode === 'https';
  return {
    plugins: conHttps ? [basicSsl()] : [],
    server: conHttps ? { host: true } : {},
    test: {
      include: ['tests/**/*.test.js'],
      environment: 'node',
      coverage: {
        include: ['src/domain/**/*.js'],
        reporter: ['text', 'html'],
      },
    },
  };
});
