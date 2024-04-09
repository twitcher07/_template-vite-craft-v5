import path from 'path';
import 'dotenv/config'
import { defineConfig, normalizePath } from 'vite'
import legacy from '@vitejs/plugin-legacy'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import copy from 'rollup-plugin-copy'
import ViteRestart from 'vite-plugin-restart'
import VitePluginSvgSpritemap from '@spiriit/vite-plugin-svg-spritemap'
import eslint from 'vite-plugin-eslint'
import PluginCritical from 'rollup-plugin-critical'
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer'

const craftEnvIsDev = (String)(process.env.ENVIRONMENT ?? process.env.CRAFT_ENVIRONMENT).toLowerCase().includes('dev');

let http_auth = {};

if (process.env.HTTP_AUTHENTICATION_USER && process.env.HTTP_AUTHENTICATION_PASSWORD) {
    http_auth.user = process.env.HTTP_AUTHENTICATION_USER;
    http_auth.pass = process.env.HTTP_AUTHENTICATION_PASSWORD;
}

// https://vitejs.dev/config/
export default defineConfig((configEnv) => ({
    base: configEnv.command === 'serve' ? '' : '/dist/',
    publicDir: './src/public',
    build: {
        emptyOutDir: true,
        manifest: true,
        outDir: './web/dist/',
        rollupOptions: {
            input: {
                main: './src/js/main.js',
                styles: './src/scss/styles.scss'
            },
            output: {
                globals: {
                    Alpine: 'Alpine',
                }
            }
        }
    },
    assetsInclude: ['./src/inline-assets/**/*'],
    plugins: [
        legacy({
            targets: ['defaults', 'not IE 11']
        }),
        eslint({
            cache: false,
            fix: true,
        }),
        ViteRestart({
            restart: [
                './templates/**/*',
            ],
        }),
        {
            ...copy({
                targets: [
                    { 
                        src: 'src/inline-assets/**/*', 
                        dest: 'web/dist/inline-assets',
                    }
                ],
                hook: 'buildStart'
            }),
            apply: 'serve'
        },
        {
            name: 'inject-inline-assets-plugin',
            transform(code, id) {
                if (/main\.(jsx?|ejs)$/i.test(id)) {
                    return `import.meta.glob([
                                '../inline-assets/**/*'
                             ]);${code}`;
                }
            },
            apply: 'build'
        },
        {
            name: 'import-images-plugin',
            transform(code, id) {
                if (/main\.(jsx?|ejs)$/i.test(id)) {
                    return `import.meta.glob(['../public/images/**/*']);${code}`;
                }
            }
        },
        viteStaticCopy({
            targets: [
                { src: './src/inline-assets/**/*', dest: 'assets' }
            ],
            hook: 'buildStart'
        }),
        ViteImageOptimizer({
            exclude: /spritemap\.[a-zA-Z0-9]*\.svg$/i
        }),
        VitePluginSvgSpritemap('./src/icons/*.svg', {
            injectSVGOnDev: true
        }),    
        PluginCritical({
            criticalUrl: process.env.PRIMARY_SITE_URL,
            criticalBase: './web/dist/criticalcss',
            criticalPages: [
                { uri: '/', template: 'homepage/_entry' },
            ],
            criticalConfig: {
                request: {
                    https: {
                        rejectUnauthorized: false
                    }
                },
                ...http_auth
            }
        })
    ],
    server: {
        origin: 'http://localhost:5173',
        port: 5173,
        host: '0.0.0.0',
        strictPort: true,
        hmr: {
            port: 5173
        }
    },
}));