#!/usr/bin/env tsx
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { spawnSync } from 'child_process';
import { existsSync, promises as fs, readdirSync, statSync } from 'fs';
import * as path from 'path';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import autoprefixer from 'autoprefixer';
import { build, type BuildOptions } from 'esbuild';
import postcss from 'postcss';
import prefixSelector from 'postcss-prefix-selector';

const ignorePatterns = [/\.test.ts$/, /\.graphql$/];

async function findAllFiles(dir: string, files: string[] = []) {
	const dirFiles = readdirSync(dir);
	for (const file of dirFiles) {
		const filePath = path.join(dir, file);
		const fileStat = statSync(filePath);
		if (fileStat.isDirectory()) {
			await findAllFiles(filePath, files);
		} else if (!ignorePatterns.some((pattern) => pattern.test(filePath))) {
			files.push(filePath);
		}
	}
	return files;
}

async function createEmptyDir(dirPath: string) {
	if (existsSync(dirPath)) {
		await fs.rm(dirPath, { recursive: true, force: true, maxRetries: 5 });
	}
	await fs.mkdir(dirPath, { recursive: true });
}

async function buildDappKit() {
	const entryPoints = await findAllFiles(path.join(process.cwd(), 'src'));

	// Clean dist directory and tsbuildinfo
	await createEmptyDir(path.join(process.cwd(), 'dist'));
	const tsbuildinfo = path.join(process.cwd(), 'tsconfig.tsbuildinfo');
	if (existsSync(tsbuildinfo)) {
		await fs.rm(tsbuildinfo);
	}

	const buildOptions: BuildOptions = {
		plugins: [
			vanillaExtractPlugin({
				async processCss(css) {
					const result = await postcss([
						autoprefixer,
						prefixSelector({
							prefix: '[data-dapp-kit]',
							transform: (prefix, selector, prefixedSelector) => {
								// Our prefix is applied to all top-level elements rendered to the DOM, so we want
								// our transform to apply to the top-level element itself and all of its children
								// Example: [data-dapp-kit].ConnectModal, [data-dapp-kit] .ConnectModal
								return `${prefix}${selector}, ${prefixedSelector}`;
							},
						}),
					]).process(css, {
						// Suppress source map warning
						from: undefined,
					});
					return result.css;
				},
			}),
		],
		packages: 'external',
		bundle: true,
	};

	// Build ESM
	await build({
		format: 'esm',
		logLevel: 'error',
		target: 'es2020',
		entryPoints,
		outdir: 'dist',
		outbase: 'src',
		sourcemap: true,
		outExtension: { '.js': '.mjs' },
		...buildOptions,
	});

	// Generate type declarations (emitDeclarationOnly since JS is built by esbuild).
	// Use spawnSync(stdio:'inherit') instead of exec so any tsc errors surface in
	// the build log — `await exec(...)` previously masked failures here, which
	// led to @mysten/dapp-kit@1.0.5 publishing with 0 type defs in dist/.
	const tscResult = spawnSync(
		'pnpm',
		['exec', 'tsc', '--project', 'tsconfig.json', '--emitDeclarationOnly'],
		{ stdio: 'inherit' },
	);
	if (tscResult.status !== 0) {
		throw new Error(`tsc exited with status ${tscResult.status}`);
	}

	// Belt-and-suspenders: tsc has been known to exit 0 without emitting under
	// some workspace configurations. Hard-fail if no .d.ts files made it to dist.
	const distFiles = readdirSync(path.join(process.cwd(), 'dist'), { recursive: true });
	const dtsCount = distFiles.filter((f) => String(f).endsWith('.d.ts')).length;
	if (dtsCount === 0) {
		throw new Error('tsc completed without errors but emitted 0 .d.ts files');
	}
	console.log(`Build complete! (${dtsCount} .d.ts files emitted)`);
}

buildDappKit().catch((error) => {
	console.error(error);
	process.exit(1);
});
