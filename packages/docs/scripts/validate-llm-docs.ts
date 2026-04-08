// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * CI validation script for LLM documentation quality.
 *
 * Checks:
 * 1. Every MDX file has both `title` and `description` in frontmatter
 * 2. No orphan MDX files (every .mdx must be referenced in a meta.json `pages` array)
 * 3. Internal links resolve to existing files or anchors
 *
 * Usage:
 *   npx tsx scripts/validate-llm-docs.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import matter from 'gray-matter';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(SCRIPT_DIR, '..', 'content');

let errors = 0;
let warnings = 0;

function error(msg: string): void {
	console.error(`ERROR: ${msg}`);
	errors++;
}

function warn(msg: string): void {
	console.warn(`WARN: ${msg}`);
	warnings++;
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
	} else if (data.description.trim().length === 0) {
		warn(`${relPath}: empty 'description' in frontmatter — reduces LLM routing effectiveness`);
	}
}

// Check 2: Orphan detection — MDX files not referenced in any meta.json
console.log('Checking for orphan MDX files...');

function getReferencedPages(dir: string): { referenced: Set<string>; hasRest: boolean } {
	const referenced = new Set<string>();
	let hasRest = false;
	const metaPath = path.join(dir, 'meta.json');

	if (fs.existsSync(metaPath)) {
		const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
		if (Array.isArray(meta.pages)) {
			for (const page of meta.pages) {
				if (page === '...') {
					hasRest = true;
				} else {
					referenced.add(page);
				}
			}
		}
	}

	return { referenced, hasRest };
}

function checkOrphans(dir: string): void {
	const { referenced, hasRest } = getReferencedPages(dir);
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		if (entry.name === 'meta.json') continue;
		const name = entry.name.replace(/\.mdx$/, '');

		if (entry.isDirectory()) {
			// Recurse into subdirectories
			checkOrphans(path.join(dir, entry.name));
			if (
				referenced.size > 0 &&
				!hasRest &&
				!referenced.has(entry.name) &&
				entry.name !== 'index'
			) {
				warn(
					`${path.relative(CONTENT_DIR, path.join(dir, entry.name))}/: directory not listed in parent meta.json`,
				);
			}
		} else if (entry.name.endsWith('.mdx') && name !== 'index') {
			if (referenced.size > 0 && !hasRest && !referenced.has(name)) {
				warn(
					`${path.relative(CONTENT_DIR, path.join(dir, entry.name))}: not listed in parent meta.json — will be excluded from navigation and index`,
				);
			}
		}
	}
}

checkOrphans(CONTENT_DIR);

// Check 3: Internal link validation
console.log('Checking internal links...');

// Build a set of all valid page paths (relative to CONTENT_DIR, without extension)
// and a map of file path → set of heading anchors
const allPages = new Set<string>();
const pageAnchors = new Map<string, Set<string>>();

function extractHeadingAnchors(content: string): Set<string> {
	const anchors = new Set<string>();
	const lines = content.split('\n');
	let inCodeBlock = false;
	for (const line of lines) {
		if (line.trimStart().startsWith('```')) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) continue;

		const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
		if (headingMatch) {
			// Convert heading text to anchor slug (same algorithm as most markdown renderers)
			const anchor = headingMatch[1]
				.toLowerCase()
				.replace(/[^\w\s-]/g, '') // remove non-word chars except spaces and hyphens
				.replace(/\s+/g, '-') // spaces to hyphens
				.replace(/-+/g, '-') // collapse multiple hyphens
				.replace(/^-|-$/g, ''); // trim leading/trailing hyphens
			anchors.add(anchor);
		}
	}
	return anchors;
}

for (const file of mdxFiles) {
	const rel = path.relative(CONTENT_DIR, file).replace(/\.mdx$/, '');
	const content = fs.readFileSync(file, 'utf-8');
	const anchors = extractHeadingAnchors(content);

	// index files resolve to their directory path
	if (rel.endsWith('/index')) {
		const dirPath = rel.replace(/\/index$/, '');
		allPages.add(dirPath);
		pageAnchors.set(dirPath, anchors);
	}
	allPages.add(rel);
	pageAnchors.set(rel, anchors);
}

// Extract markdown links from content, skipping code blocks
function extractLinks(content: string): { target: string; line: number }[] {
	const links: { target: string; line: number }[] = [];
	const lines = content.split('\n');
	let inCodeBlock = false;
	for (let i = 0; i < lines.length; i++) {
		if (lines[i].trimStart().startsWith('```')) {
			inCodeBlock = !inCodeBlock;
			continue;
		}
		if (inCodeBlock) continue;

		const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
		let match;
		while ((match = linkRegex.exec(lines[i])) !== null) {
			links.push({ target: match[2], line: i + 1 });
		}
	}
	return links;
}

function resolveLink(
	target: string,
	fileDir: string,
): { resolvedRel: string; anchor: string | null } | null {
	const [linkPath, anchor] = target.split('#');

	// Anchor-only link
	if (!linkPath) return null;

	// Resolve the link relative to the file's directory or content root
	let resolved: string;
	if (linkPath.startsWith('/')) {
		resolved = path.resolve(CONTENT_DIR, linkPath.slice(1));
	} else {
		resolved = path.resolve(fileDir, linkPath);
	}

	return { resolvedRel: path.relative(CONTENT_DIR, resolved), anchor: anchor ?? null };
}

for (const file of mdxFiles) {
	const content = fs.readFileSync(file, 'utf-8');
	const relPath = path.relative(CONTENT_DIR, file);
	const fileDir = path.dirname(file);
	const selfAnchors = pageAnchors.get(relPath.replace(/\.mdx$/, ''));

	for (const { target, line } of extractLinks(content)) {
		// Skip external links, special links, and generated paths
		if (
			target.startsWith('http://') ||
			target.startsWith('https://') ||
			target.startsWith('mailto:') ||
			target.startsWith('/typedoc/')
		) {
			continue;
		}

		// Same-page anchor link
		if (target.startsWith('#')) {
			const anchor = target.slice(1);
			if (selfAnchors && !selfAnchors.has(anchor)) {
				error(`${relPath}:${line}: broken anchor '${target}' (no matching heading found)`);
			}
			continue;
		}

		// Index pages are served at their directory path (e.g., sui/index.mdx → /sui).
		// Relative links like ./foo from an index page resolve on the filesystem to
		// the correct sibling, but in the browser they resolve relative to the parent
		// directory because the URL has no trailing segment. Use absolute paths instead.
		const isIndexPage = path.basename(file, '.mdx') === 'index';
		if (isIndexPage && !target.startsWith('/')) {
			error(
				`${relPath}:${line}: relative link '${target}' in index page will break at runtime — use an absolute path instead`,
			);
			continue;
		}

		const resolved = resolveLink(target, fileDir);
		if (!resolved) continue;

		const { resolvedRel, anchor } = resolved;

		// Check if target page exists
		const pageExists =
			allPages.has(resolvedRel) ||
			fs.existsSync(path.resolve(CONTENT_DIR, resolvedRel)) ||
			fs.existsSync(path.resolve(CONTENT_DIR, resolvedRel + '.mdx')) ||
			fs.existsSync(path.resolve(CONTENT_DIR, resolvedRel, 'index.mdx')) ||
			fs.existsSync(path.resolve(CONTENT_DIR, resolvedRel, 'meta.json'));

		if (!pageExists) {
			error(`${relPath}:${line}: broken link to '${target}' (resolved to '${resolvedRel}')`);
			continue;
		}

		// If link has an anchor fragment, validate it exists in the target page
		if (anchor) {
			const targetAnchors = pageAnchors.get(resolvedRel);
			if (targetAnchors && !targetAnchors.has(anchor)) {
				error(
					`${relPath}:${line}: broken anchor '${target}' (page exists but '#${anchor}' not found)`,
				);
			}
		}
	}
}

// Summary
console.log('');
if (warnings > 0) {
	console.warn(`Found ${warnings} warning(s).`);
}
if (errors > 0) {
	console.error(`Found ${errors} error(s). Fix them before merging.`);
	process.exit(1);
} else {
	console.log('All checks passed.');
}
