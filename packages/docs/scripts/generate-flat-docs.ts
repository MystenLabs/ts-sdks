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

import matter from 'gray-matter';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';

const CONTENT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'content');
const OUTPUT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'dist');

interface MdxNode {
	type: string;
	name?: string;
	value?: string;
	children?: MdxNode[];
}

/**
 * Remark plugin that strips MDX-specific nodes (JSX elements, imports, exports)
 * and converts the AST to plain markdown.
 */
function remarkStripMdx() {
	return (tree: MdxNode) => {
		stripMdxNodes(tree);
	};
}

function stripMdxNodes(node: MdxNode): void {
	if (!node.children) return;

	node.children = node.children.filter((child) => {
		const mdxChild = child as MdxNode;
		// Remove MDX-specific node types
		if (
			mdxChild.type === 'mdxJsxFlowElement' ||
			mdxChild.type === 'mdxJsxTextElement' ||
			mdxChild.type === 'mdxjsEsm' ||
			mdxChild.type === 'mdxFlowExpression' ||
			mdxChild.type === 'mdxTextExpression'
		) {
			return false;
		}
		return true;
	});

	for (const child of node.children) {
		if ('children' in child) {
			stripMdxNodes(child);
		}
	}
}

async function processFile(mdxPath: string, outputPath: string): Promise<void> {
	const raw = fs.readFileSync(mdxPath, 'utf-8');
	const { content, data } = matter(raw);

	const processor = remark()
		.use(remarkMdx)
		.use(remarkStripMdx)
		.use(remarkGfm)
		.use(remarkStringify, {
			bullet: '-',
			fences: true,
			listItemIndent: 'one',
		});

	const result = await processor.process(content);
	let markdown = String(result);

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

async function main(): Promise<void> {
	// Clean previous output (but preserve llms-index.md and recommended-context.md)
	if (fs.existsSync(OUTPUT_DIR)) {
		const entries = fs.readdirSync(OUTPUT_DIR);
		for (const entry of entries) {
			if (entry === 'llms-index.md' || entry === 'recommended-context.md') continue;
			const fullPath = path.join(OUTPUT_DIR, entry);
			fs.rmSync(fullPath, { recursive: true, force: true });
		}
	}

	// Directories to exclude from flat docs output
	const EXCLUDED_DIRS = ['dapp-kit/legacy'];

	// Find all MDX files
	const mdxFiles = findMdxFiles(CONTENT_DIR).filter((f) => {
		const rel = path.relative(CONTENT_DIR, f);
		return !EXCLUDED_DIRS.some(
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

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
