import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsconfigPaths from 'vite-tsconfig-paths';
// @ts-ignore
import pkg from './package.json' assert { type: 'json' };

export default defineConfig(({ mode }) => ({
    build: {
        lib: {
            entry: 'src/index.ts',
            name: 'WinterCardano',
            formats: ['cjs', 'es'],
        },
        rollupOptions: {
            external: [
                ...Object.keys(pkg.dependencies), // Use package.json dependencies as externals
            ],
        },
        sourcemap: true,
        minify: true,
    },
    plugins: [
        tsconfigPaths(),
        dts({
            entryRoot: 'src',
        }),
    ],
    define: {
        'import.meta.vitest': 'undefined',
    },
    test: {
        includeSource: ['src/**/*.{js,ts}'],
    },
}));