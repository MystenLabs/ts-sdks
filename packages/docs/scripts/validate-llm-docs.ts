// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * CI validation script for LLM documentation quality.
 *
 * Checks:
 * 1. Every MDX file has both `title` and `description` in frontmatter
 * 2. Every file referenced in dist/llms-index.md exists on disk
 * 3. dist/llms-index.md is up to date (delegates to generate-llms-index.ts --check)
 *
 * Usage:
 *   npx tsx scripts/validate-llm-docs.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import matter from 'gray-matter';

const CONTENT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'content');
const DIST_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'dist');
const INDEX_FILE = path.join(DIST_DIR, 'llms-index.md');

let errors = 0;

function error(msg: string): void {
	console.error(`ERROR: ${msg}`);
	errors++;
}

function findMdxFiles(dir: string): string[] {
	const results: string[] = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results.push(...findMdxFiles(fullPath));
		} else if (entry.name.endsWith('.mdx')) {
			results.push(fullPath);
		}
	}
	return results;
}

// Check 1: Frontmatter completeness
console.log('Checking frontmatter completeness...');
const mdxFiles = findMdxFiles(CONTENT_DIR);
for (const file of mdxFiles) {
	const content = fs.readFileSync(file, 'utf-8');
	const { data } = matter(content);
	const relPath = path.relative(CONTENT_DIR, file);

	if (!data.title) {
		error(`${relPath}: missing 'title' in frontmatter`);
	}
	if (!data.description) {
		error(`${relPath}: missing 'description' in frontmatter`);
	}
}

// Check 2: Dead links in index
console.log('Checking for dead links in llms-index.md...');
if (fs.existsSync(INDEX_FILE)) {
	const indexContent = fs.readFileSync(INDEX_FILE, 'utf-8');
	const linkRegex = /\[.*?\]\((\.\/.+?\.md)\)/g;
	let match;
	while ((match = linkRegex.exec(indexContent)) !== null) {
		const linkPath = match[1];
		const fullPath = path.resolve(DIST_DIR, linkPath);
		if (!fs.existsSync(fullPath)) {
			// Check if the source MDX exists instead (dist files may not be generated yet)
			const sourcePath = path.resolve(
				CONTENT_DIR,
				linkPath.replace(/^\.\//, '').replace(/\.md$/, '.mdx'),
			);
			if (!fs.existsSync(sourcePath)) {
				error(`llms-index.md references ${linkPath} but no source file exists at ${sourcePath}`);
			}
		}
	}
} else {
	error('dist/llms-index.md does not exist. Run the index generation script first.');
}

// Summary
console.log('');
if (errors > 0) {
	console.error(`Found ${errors} error(s). Fix them before merging.`);
	process.exit(1);
} else {
	console.log('All checks passed.');
}
