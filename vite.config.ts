import { basename, extname } from 'node:path'

import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import tsconfigPaths from 'vite-tsconfig-paths'
// @ts-ignore
import pkg from './package.json' assert { type: 'json' }

const defaultExport = pkg.exports['.'].default
const entryName = basename(defaultExport, extname(defaultExport))

export default defineConfig(({ mode }) => ({
    build: {
        lib: {
            entry: {
                [entryName]: 'src/index.ts'
            },
            formats: ['cjs', 'es']
        },
        rollupOptions: {
            external: [
                ...Object.keys(pkg.dependencies), // Use package.json dependencies as externals
            ]
        },
        sourcemap: true,
        minify: true
    },
    plugins: [tsconfigPaths(), dts()],
    define: {
        'import.meta.vitest': 'undefined',
    },
    test: {
        includeSource: ['src/**/*.{js,ts}'],
    },
}))