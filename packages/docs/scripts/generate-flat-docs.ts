// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Generates flat markdown files in dist/ from MDX source files.
 * Strips JSX components and converts MDX to plain markdown.
 *
 * Usage:
 *   npx tsx scripts/generate-flat-docs.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { EXCLUDED_SUBDIRS, findMdxFiles, processFile } from './docs-utils.js';

const CONTENT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'content');
const OUTPUT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'dist');

async function main(): Promise<void> {
	// Clean previous output (but preserve llms-index.md)
	if (fs.existsSync(OUTPUT_DIR)) {
		const entries = fs.readdirSync(OUTPUT_DIR);
		for (const entry of entries) {
			if (entry === 'llms-index.md') continue;
			const fullPath = path.join(OUTPUT_DIR, entry);
			fs.rmSync(fullPath, { recursive: true, force: true });
		}
	}

	// Find all MDX files
	const mdxFiles = findMdxFiles(CONTENT_DIR).filter((f) => {
		const rel = path.relative(CONTENT_DIR, f);
		return !EXCLUDED_SUBDIRS.some(
			(dir) => rel.startsWith(dir + path.sep) || rel.startsWith(dir + '/'),
		);
	});
	console.log(`Processing ${mdxFiles.length} MDX files...`);

	let processed = 0;
	for (const mdxFile of mdxFiles) {
		const relativePath = path.relative(CONTENT_DIR, mdxFile);
		const outputPath = path.join(OUTPUT_DIR, relativePath.replace(/\.mdx$/, '.md'));

		try {
			await processFile(mdxFile, outputPath);
			processed++;
		} catch (err) {
			console.error(`Error processing ${relativePath}:`, err);
		}
	}

	console.log(`Generated ${processed}/${mdxFiles.length} markdown files in dist/`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
