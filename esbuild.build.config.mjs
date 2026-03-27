import * as esbuild from 'esbuild';

await esbuild.build({
	entryPoints: ['./Source/Apps/rest.ts'],
	outfile: './Dist/index.mjs',
	bundle: true,
	platform: 'node',
	format: 'esm',
	target: 'node22',
	sourcemap: 'inline',
	legalComments: 'none',
	tsconfig: './tsconfig.json',
});
