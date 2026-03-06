// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Generates dist/llms-index.md from meta.json files and MDX frontmatter.
 *
 * Usage:
 *   npx tsx scripts/generate-llms-index.ts          # write to dist/llms-index.md
 *   npx tsx scripts/generate-llms-index.ts --check   # exit 1 if output differs from committed file
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import matter from 'gray-matter';

const CONTENT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'content');
const OUTPUT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'llms-index.md');

interface MetaJson {
	root?: boolean;
	title?: string;
	description?: string;
	pages?: string[];
	index?: { title?: string; root?: boolean };
	[key: string]: unknown;
}

interface PageInfo {
	title: string;
	description: string;
	relativePath: string;
}

function readMetaJson(dir: string): MetaJson | null {
	const metaPath = path.join(dir, 'meta.json');
	if (!fs.existsSync(metaPath)) return null;
	return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as MetaJson;
}

function readMdxFrontmatter(filePath: string): { title?: string; description?: string } {
	if (!fs.existsSync(filePath)) return {};
	const content = fs.readFileSync(filePath, 'utf-8');
	const { data } = matter(content);
	return { title: data.title, description: data.description };
}

function getPageEntries(dir: string, basePath: string, seen = new Set<string>()): PageInfo[] {
	const meta = readMetaJson(dir);
	const entries: PageInfo[] = [];

	function addEntry(entry: PageInfo): void {
		if (seen.has(entry.relativePath)) return;
		seen.add(entry.relativePath);
		entries.push(entry);
	}

	if (meta?.pages) {
		for (const pageName of meta.pages) {
			// Skip "..." (rest pages marker used by fumadocs)
			if (pageName === '...') continue;

			const pageDir = path.join(dir, pageName);
			const mdxFile = path.join(dir, `${pageName}.mdx`);

			if (fs.existsSync(pageDir) && fs.statSync(pageDir).isDirectory()) {
				// It's a subdirectory — check for index.mdx
				const indexFile = path.join(pageDir, 'index.mdx');
				const subMeta = readMetaJson(pageDir);
				const subTitle = subMeta?.title || pageName;

				if (fs.existsSync(indexFile)) {
					const fm = readMdxFrontmatter(indexFile);
					addEntry({
						title: fm.title || subTitle,
						description: fm.description || subMeta?.description || '',
						relativePath: `${basePath}/${pageName}/index.md`,
					});
				}

				// Recurse into subdirectory pages (entries already tracked in shared `seen`)
				const subEntries = getPageEntries(pageDir, `${basePath}/${pageName}`, seen);
				entries.push(...subEntries);
			} else if (fs.existsSync(mdxFile)) {
				const fm = readMdxFrontmatter(mdxFile);
				addEntry({
					title: fm.title || pageName,
					description: fm.description || '',
					relativePath: `${basePath}/${pageName}.md`,
				});
			}
		}
	} else {
		// No pages array — scan for MDX files alphabetically
		const files = fs
			.readdirSync(dir)
			.filter((f) => f.endsWith('.mdx'))
			.sort();
		for (const file of files) {
			const name = file.replace(/\.mdx$/, '');
			if (name === 'index') continue; // Skip index, it's listed at the section level
			const fm = readMdxFrontmatter(path.join(dir, file));
			addEntry({
				title: fm.title || name,
				description: fm.description || '',
				relativePath: `${basePath}/${name}.md`,
			});
		}
	}

	return entries;
}

function generateIndex(): string {
	const lines: string[] = [];

	lines.push('# Sui TypeScript SDK Documentation');
	lines.push(
		'> Reference documentation for the @mysten/* TypeScript SDK packages for the Sui blockchain.',
	);
	lines.push('');

	// Find all content directories (root meta.json or directories with MDX files)
	const rootDirs = fs
		.readdirSync(CONTENT_DIR)
		.filter((name) => {
			const dir = path.join(CONTENT_DIR, name);
			if (!fs.statSync(dir).isDirectory()) return false;
			const meta = readMetaJson(dir);
			// Include if it has root: true in meta.json, or has MDX files but no meta.json
			if (meta?.root === true) return true;
			if (!meta) {
				// Check if directory has any MDX files
				return fs.readdirSync(dir).some((f) => f.endsWith('.mdx'));
			}
			return false;
		})
		.sort();

	for (const rootName of rootDirs) {
		const rootDir = path.join(CONTENT_DIR, rootName);
		const meta = readMetaJson(rootDir);

		// Skip api-reference — it's auto-generated, not useful for LLM docs
		if (rootName === 'api-reference') continue;

		// Subdirectories to exclude from the index
		const EXCLUDED_SUBDIRS = ['dapp-kit/legacy'];

		const sectionTitle = meta?.title || rootName;
		const sectionDesc = meta?.description || '';

		lines.push(`## ${sectionTitle}`);
		if (sectionDesc) {
			lines.push(`> ${sectionDesc}`);
		}
		lines.push('');

		// Add index page if it exists
		const indexFile = path.join(rootDir, 'index.mdx');
		if (fs.existsSync(indexFile)) {
			const fm = readMdxFrontmatter(indexFile);
			const desc = fm.description || 'Overview and getting started';
			lines.push(`- [${fm.title || sectionTitle}](./${rootName}/index.md): ${desc}`);
		}

		// Add all pages
		const entries = getPageEntries(rootDir, `./${rootName}`);
		for (const entry of entries) {
			// Skip if it's the same as the index we just added
			if (entry.relativePath === `./${rootName}/index.md`) continue;

			// Skip excluded subdirectories
			if (EXCLUDED_SUBDIRS.some((dir) => entry.relativePath.startsWith(`./${dir}/`))) continue;

			const desc = entry.description ? `: ${entry.description}` : '';
			lines.push(`- [${entry.title}](${entry.relativePath})${desc}`);
		}

		lines.push('');
	}

	return lines.join('\n');
}

// Main
const checkMode = process.argv.includes('--check');
const indexContent = generateIndex();

if (checkMode) {
	if (!fs.existsSync(OUTPUT_FILE)) {
		console.error('ERROR: dist/llms-index.md does not exist. Run without --check to generate.');
		process.exit(1);
	}
	const existing = fs.readFileSync(OUTPUT_FILE, 'utf-8');
	if (existing !== indexContent) {
		console.error(
			'ERROR: dist/llms-index.md is out of date. Run `npx tsx scripts/generate-llms-index.ts` to update.',
		);
		process.exit(1);
	}
	console.log('dist/llms-index.md is up to date.');
} else {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(OUTPUT_FILE, indexContent);
	console.log(`Generated ${OUTPUT_FILE}`);
}
