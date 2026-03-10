// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Reusable script that generates LLM-friendly docs for a single package.
 *
 * Detects the calling package from cwd, finds matching MDX content in the
 * docs package, processes MDX → plain markdown, and generates an index.
 *
 * Called from each SDK package:
 *   "build:docs": "tsx ../docs/scripts/build-docs.ts"
 *
 * Called from the docs package to generate all sections into dist/:
 *   "build:docs": "tsx scripts/build-docs.ts --all"
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { EXCLUDED_SUBDIRS, findMdxFiles, generateSectionIndex, processFile } from './docs-utils.js';

const SCRIPTS_DIR = new URL('.', import.meta.url).pathname;
const DOCS_PKG_DIR = path.resolve(SCRIPTS_DIR, '..');
const CONTENT_DIR = path.join(DOCS_PKG_DIR, 'content');

/**
 * Mapping from package directory name to content configuration.
 * Packages not listed here default to using content/<packageName>/ with no exclusions.
 */
interface ContentMapping {
	/** Content section directory name (under content/) */
	contentSection: string;
	/** If set, only include content from this subdirectory */
	subdirectory?: string;
	/** Subdirectories to exclude (relative to content/) */
	excludedSubdirs?: string[];
}

const PACKAGE_CONTENT_MAP: Record<string, ContentMapping> = {
	// Legacy dapp-kit gets only the legacy subdirectory
	'dapp-kit': {
		contentSection: 'dapp-kit',
		subdirectory: 'legacy',
	},
	// New dapp-kit packages get everything except legacy
	'dapp-kit-core': {
		contentSection: 'dapp-kit',
		excludedSubdirs: ['dapp-kit/legacy'],
	},
	'dapp-kit-react': {
		contentSection: 'dapp-kit',
		excludedSubdirs: ['dapp-kit/legacy'],
	},
};

/**
 * Build docs for a single content section into an output directory.
 *
 * @param sectionName  Name of the content section (e.g. "sui", "dapp-kit")
 * @param outputDir    Absolute path to write docs into
 */
async function buildSectionDocs(
	sectionName: string,
	outputDir: string,
	options: { excludedSubdirs?: string[]; subdirectory?: string } = {},
): Promise<number> {
	const sectionContentDir = path.join(CONTENT_DIR, sectionName);
	const excludedSubdirs = options.excludedSubdirs ?? [];
	const contentRoot = options.subdirectory
		? path.join(sectionContentDir, options.subdirectory)
		: sectionContentDir;

	if (!fs.existsSync(contentRoot)) {
		return 0;
	}

	// Clean previous output
	if (fs.existsSync(outputDir)) {
		fs.rmSync(outputDir, { recursive: true, force: true });
	}
	fs.mkdirSync(outputDir, { recursive: true });

	// Find and process MDX files (respecting exclusions)
	const mdxFiles = findMdxFiles(contentRoot).filter((f) => {
		const rel = path.relative(CONTENT_DIR, f);
		return !excludedSubdirs.some(
			(dir) => rel.startsWith(dir + path.sep) || rel.startsWith(dir + '/'),
		);
	});

	let processed = 0;
	let errors = 0;
	for (const mdxFile of mdxFiles) {
		const relativePath = path.relative(contentRoot, mdxFile);
		const mdOutputPath = path.join(outputDir, relativePath.replace(/\.mdx$/, '.md'));

		try {
			await processFile(mdxFile, mdOutputPath);
			processed++;
		} catch (err) {
			errors++;
			console.error(`  Error processing ${relativePath}:`, err);
		}
	}

	if (errors > 0) {
		throw new Error(`Failed to process ${errors} file(s) in ${sectionName}`);
	}

	// Generate per-section index
	const sectionIndex = generateSectionIndex(contentRoot, '.', '#', excludedSubdirs);
	fs.writeFileSync(path.join(outputDir, 'llms-index.md'), sectionIndex);

	// Format generated files with prettier
	execSync(`npx prettier --write "${outputDir}/**/*.md"`, { stdio: 'ignore' });

	return processed;
}

/** --all mode: build docs for every content section into dist/ and generate the full index. */
async function buildAll(): Promise<void> {
	const distDir = path.join(DOCS_PKG_DIR, 'dist');

	// Clean dist
	if (fs.existsSync(distDir)) {
		fs.rmSync(distDir, { recursive: true, force: true });
	}
	fs.mkdirSync(distDir, { recursive: true });

	// Find all content sections
	const sections = fs
		.readdirSync(CONTENT_DIR)
		.filter((name) => {
			const dir = path.join(CONTENT_DIR, name);
			if (!fs.statSync(dir).isDirectory()) return false;
			if (name === 'api-reference') return false;
			return true;
		})
		.sort();

	let totalFiles = 0;
	for (const section of sections) {
		const outputDir = path.join(distDir, section);
		const count = await buildSectionDocs(section, outputDir, {
			excludedSubdirs: EXCLUDED_SUBDIRS,
		});
		if (count > 0) {
			console.log(`  ${section}/ — ${count} files`);
		}
		totalFiles += count;
	}

	// Generate the full combined index
	const fullIndexLines: string[] = [
		'# Sui TypeScript SDK Documentation',
		'> Reference documentation for the @mysten/* TypeScript SDK packages for the Sui blockchain.',
		'',
	];
	for (const section of sections) {
		const sectionDir = path.join(CONTENT_DIR, section);
		if (!fs.existsSync(sectionDir)) continue;
		fullIndexLines.push(generateSectionIndex(sectionDir, `./${section}`, '##', EXCLUDED_SUBDIRS));
	}
	fs.writeFileSync(path.join(distDir, 'llms-index.md'), fullIndexLines.join('\n'));

	// Format the top-level index
	execSync(`npx prettier --write "${path.join(distDir, 'llms-index.md')}"`, { stdio: 'ignore' });

	console.log(`Generated ${totalFiles} files across ${sections.length} sections in dist/`);
}

/** Single-package mode: detect package from cwd and build its docs. */
async function buildSingle(): Promise<void> {
	const cwd = process.cwd();
	const packageName = path.basename(cwd);
	const mapping = PACKAGE_CONTENT_MAP[packageName];

	const contentSection = mapping?.contentSection ?? packageName;
	const sectionContentDir = path.join(CONTENT_DIR, contentSection);

	if (!fs.existsSync(sectionContentDir)) {
		console.log(`No docs content found for "${packageName}" — skipping`);
		return;
	}

	const outputDir = path.join(cwd, 'docs');
	const count = await buildSectionDocs(contentSection, outputDir, {
		subdirectory: mapping?.subdirectory,
		excludedSubdirs: mapping?.excludedSubdirs,
	});
	console.log(`Generated ${count} docs files in ${packageName}/docs/`);
}

// Main
async function main(): Promise<void> {
	if (process.argv.includes('--all')) {
		await buildAll();
	} else {
		await buildSingle();
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
