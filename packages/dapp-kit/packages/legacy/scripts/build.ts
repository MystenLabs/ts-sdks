#!/usr/bin/env tsx
// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as child_process from 'child_process';
import { existsSync, promises as fs, readdirSync, statSync } from 'fs';
import util from 'node:util';
import * as path from 'path';
import { vanillaExtractPlugin } from '@vanilla-extract/esbuild-plugin';
import autoprefixer from 'autoprefixer';
import { build, type BuildOptions } from 'esbuild';
import postcss from 'postcss';
import prefixSelector from 'postcss-prefix-selector';

const exec = util.promisify(child_process.exec);

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

	// Generate type declarations (emitDeclarationOnly since JS is built by esbuild)
	await exec('pnpm tsc --project tsconfig.json --emitDeclarationOnly');

	console.log('Build complete!');
}

buildDappKit().catch((error) => {
	console.error(error);
	process.exit(1);
});
