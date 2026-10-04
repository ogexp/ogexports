import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

const rawPort = process.env.PORT ?? '5003';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? '/';
const routePrefix = basePath === '/' ? '' : basePath.replace(/\/$/, '');

function removeRoutePrefix(requestPath: string) {
  if (!routePrefix || !requestPath.startsWith(routePrefix)) return requestPath;
  return requestPath.slice(routePrefix.length) || '/';
}

function createLaravelProxy() {
  return {
    target: 'https://api.ogexports.co',
    changeOrigin: true,
    secure: true,
    cookieDomainRewrite: '',
    rewrite: removeRoutePrefix,
    configure(proxy) {
      proxy.on('proxyReq', (proxyRequest) => {
        // The Laravel API accepts the OG Exports site origin. This proxy is
        // development-only; cookie rewriting keeps Sanctum sessions on preview.
        proxyRequest.setHeader('Origin', 'https://ogexports.co');
        proxyRequest.setHeader('Referer', 'https://ogexports.co/');
      });
    },
  };
}

const proxyPrefix = routePrefix || '';
const proxyFor = (suffix: string) => ({
  [`${proxyPrefix}${suffix}` || suffix]: createLaravelProxy(),
});

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss({ optimize: true }),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@workspace/api-client-react': path.resolve(import.meta.dirname, 'src/lib/api-client-react.ts'),
      '@workspace/api-zod': path.resolve(import.meta.dirname, 'src/lib/api-zod.ts'),
      '@workspace/object-storage-web': path.resolve(import.meta.dirname, 'src/lib/object-storage-web.ts'),
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          // React runtime — must stay together (react, react-dom, scheduler,
          // and helpers) so the modules evaluate in the right order. Splitting
          // scheduler/react-dom across chunks causes a load-order cycle and the
          // "Cannot set properties of undefined (setting 'Activity')" crash.
          if (
            /[\\/]node_modules[\\/]\.pnpm[\\/](react|react-dom|scheduler|react-is|use-sync-external-store|object-assign)@/.test(id) ||
            /[\\/]node_modules[\\/](react|react-dom|scheduler|react-is|use-sync-external-store|object-assign)[\\/]/.test(id)
          ) {
            return 'vendor-react';
          }
          // Charts (recharts + d3 deps) — only loaded on chart pages
          if (id.includes('recharts') || id.includes('/d3-')) return 'vendor-charts';
          // Clerk auth — only loaded when auth is needed
          if (id.includes('@clerk')) return 'vendor-clerk';
          // TanStack Query
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          // Radix UI primitives — keep all together to avoid cross-chunk cycles
          if (id.includes('@radix-ui')) return 'vendor-radix';
          // Icon libraries
          if (id.includes('lucide-react') || id.includes('react-icons')) return 'vendor-icons';
          // Animation — only used on Home / Certifications / OGAssistant
          if (id.includes('framer-motion')) return 'vendor-motion';
          // i18n runtime
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
          // Form / validation stack
          if (
            id.includes('/zod/') ||
            id.includes('\\zod\\') ||
            /[\\/]zod@/.test(id) ||
            id.includes('react-hook-form') ||
            id.includes('@hookform/resolvers')
          ) {
            return 'vendor-forms';
          }
          if (id.includes('date-fns')) return 'vendor-date-fns';
          // Remaining smaller libs (wouter, sonner, cmdk, clsx, etc.)
          return 'vendor-misc';
        },
      },
    },
  },
  optimizeDeps: {
    exclude: [
      '@workspace/api-client-react',
      '@workspace/api-zod',
      '@workspace/object-storage-web',
    ],
  },
  server: {
    port,
    strictPort: false,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: false,
    },
    // Same-origin API in dev — avoids cross-origin fetch failures (Cursor browser, cookies).
    proxy: {
      ...proxyFor('/api'),
      ...proxyFor('/sanctum'),
      ...proxyFor('/storage'),
      ...proxyFor('/upload'),
      ...proxyFor('/product_images'),
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
