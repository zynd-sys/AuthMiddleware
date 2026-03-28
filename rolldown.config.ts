import { defineConfig } from 'rolldown';

const banner = `import * as buildModule from 'node:module';
import * as buildURL from 'node:url';
import * as buildPath from 'node:path';
const require = buildModule.Module.createRequire(import.meta.url);
const __filename = buildURL.fileURLToPath(import.meta.url)
const __dirname = buildPath.dirname(__filename)`


export default defineConfig({
    input: './Source/Apps/rest.ts',
    platform: 'node',
    output: {
        banner,
        cleanDir: true,
        dir: './Dist',
        format: 'esm',
        entryFileNames: '[name].mjs',

    },
});