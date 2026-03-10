// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Shared utilities for LLM doc generation scripts.
 *
 * - MDX → plain markdown processing (convert Callouts, strip JSX, frontmatter)
 * - Index generation from meta.json + MDX frontmatter
 * - File discovery helpers
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import matter from 'gray-matter';

// ---------------------------------------------------------------------------
// MDX → Markdown processing
// ---------------------------------------------------------------------------

/** Map Callout type attributes to markdown prefix labels. */
const CALLOUT_LABELS: Record<string, string> = {
	warn: '**Warning:**',
	warning: '**Warning:**',
	error: '**Error:**',
	info: '**Note:**',
};

/**
 * Convert MDX content to plain markdown using string transforms.
 * - Converts <Callout> blocks to blockquotes with labels
 * - Removes import/export statements
 * - Removes self-closing JSX tags (e.g. <ConnectButton />)
 * - Removes opening/closing JSX wrapper tags, preserving children
 */
function mdxToMarkdown(mdx: string): string {
	let md = mdx;

	// Remove import/export lines
	md = md.replace(/^(?:import|export)\s+.*$/gm, '');

	// Convert <Callout type="...">content</Callout> to blockquotes (multiline)
	md = md.replace(
		/<Callout(?:\s+type=["'](\w+)["'])?\s*>([\s\S]*?)<\/Callout>/g,
		(_match, type: string | undefined, content: string) => {
			const label = CALLOUT_LABELS[type ?? ''] ?? '';
			const trimmed = content.trim();
			const prefix = label ? `${label} ` : '';
			// Convert to blockquote: prefix each line with >
			return trimmed
				.split('\n')
				.map((line, i) => `> ${i === 0 ? prefix : ''}${line.trim()}`)
				.join('\n');
		},
	);

	// Remove JSX tags that are alone on a line, but skip lines inside fenced code blocks.
	const lines = md.split('\n');
	let inFence = false;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].startsWith('```')) {
			inFence = !inFence;
			continue;
		}
		if (inFence) continue;

		// Self-closing: <Component ... />
		// Opening: <Component ...>
		// Closing: </Component>
		lines[i] = lines[i]
			.replace(/^<[A-Z][a-zA-Z]*\b[^>]*\/>\s*$/, '')
			.replace(/^<[A-Z][a-zA-Z]*\b[^>]*>\s*$/, '')
			.replace(/^<\/[A-Z][a-zA-Z]*>\s*$/, '');
	}
	md = lines.join('\n');

	// Clean up excessive blank lines (3+ → 2)
	md = md.replace(/\n{3,}/g, '\n\n');

	return md.trim();
}

/** Convert a single MDX file to plain markdown and write to outputPath. */
export async function processFile(mdxPath: string, outputPath: string): Promise<void> {
	const raw = fs.readFileSync(mdxPath, 'utf-8');
	const { content, data } = matter(raw);

	let markdown = mdxToMarkdown(content);

	// Add title as H1 if present in frontmatter
	if (data.title) {
		markdown = `# ${data.title}\n\n${markdown}`;
	}

	// Add description as blockquote if present
	if (data.description) {
		const titleLine = markdown.indexOf('\n');
		if (titleLine !== -1 && data.title) {
			markdown =
				markdown.slice(0, titleLine + 1) +
				`\n> ${data.description}\n` +
				markdown.slice(titleLine + 1);
		}
	}

	const outputDir = path.dirname(outputPath);
	fs.mkdirSync(outputDir, { recursive: true });
	fs.writeFileSync(outputPath, markdown);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------

/** Recursively find all .mdx files under a directory. */
export function findMdxFiles(dir: string): string[] {
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

// ---------------------------------------------------------------------------
// Index generation
// ---------------------------------------------------------------------------

export interface MetaJson {
	root?: boolean;
	title?: string;
	description?: string;
	pages?: string[];
	index?: { title?: string; root?: boolean };
	[key: string]: unknown;
}

export interface PageInfo {
	title: string;
	description: string;
	relativePath: string;
}

export function readMetaJson(dir: string): MetaJson | null {
	const metaPath = path.join(dir, 'meta.json');
	if (!fs.existsSync(metaPath)) return null;
	return JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as MetaJson;
}

export function readMdxFrontmatter(filePath: string): { title?: string; description?: string } {
	if (!fs.existsSync(filePath)) return {};
	const content = fs.readFileSync(filePath, 'utf-8');
	const { data } = matter(content);
	return { title: data.title, description: data.description };
}

export function getPageEntries(
	dir: string,
	basePath: string,
	seen = new Set<string>(),
): PageInfo[] {
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

/** Directories excluded from all generated docs and indices. */
export const EXCLUDED_SUBDIRS = ['dapp-kit/legacy'];

/**
 * Generate a markdown index for a single content section (e.g. "sui", "dapp-kit").
 *
 * @param sectionDir  Absolute path to the content section directory
 * @param basePath    Prefix for relative links (e.g. "." for per-package, "./sui" for full index)
 * @param heading     Optional heading level override (default: "##")
 */
export function generateSectionIndex(
	sectionDir: string,
	basePath: string,
	heading: '#' | '##' = '##',
	excludedSubdirs: string[] = EXCLUDED_SUBDIRS,
): string {
	const meta = readMetaJson(sectionDir);
	const sectionName = path.basename(sectionDir);
	const sectionTitle = meta?.title || sectionName;
	const sectionDesc = meta?.description || '';

	// Compute section-relative exclusions from the provided exclusions list.
	// e.g. "dapp-kit/legacy" → "legacy" when sectionName is "dapp-kit"
	const sectionExclusions = excludedSubdirs
		.filter((dir) => dir.startsWith(sectionName + '/'))
		.map((dir) => dir.slice(sectionName.length + 1));

	const lines: string[] = [];

	lines.push(`${heading} ${sectionTitle}`);
	if (sectionDesc) {
		lines.push(`> ${sectionDesc}`);
	}
	lines.push('');

	// Add index page if it exists
	const indexFile = path.join(sectionDir, 'index.mdx');
	if (fs.existsSync(indexFile)) {
		const fm = readMdxFrontmatter(indexFile);
		const desc = fm.description || 'Overview and getting started';
		lines.push(`- [${fm.title || sectionTitle}](${basePath}/index.md): ${desc}`);
	}

	// Add all pages
	const entries = getPageEntries(sectionDir, basePath);
	for (const entry of entries) {
		// Skip if it's the same as the index we just added
		if (entry.relativePath === `${basePath}/index.md`) continue;

		// Skip excluded subdirectories (check relative to basePath)
		if (sectionExclusions.some((excl) => entry.relativePath.startsWith(`${basePath}/${excl}/`))) {
			continue;
		}

		const desc = entry.description ? `: ${entry.description}` : '';
		lines.push(`- [${entry.title}](${entry.relativePath})${desc}`);
	}

	lines.push('');
	return lines.join('\n');
}
