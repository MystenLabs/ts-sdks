// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Generates doc indices from meta.json files and MDX frontmatter:
 *   - dist/llms-index.md              — full index across all sections
 *   - dist/<section>/llms-index.md    — per-section index (one per content dir)
 *
 * Usage:
 *   npx tsx scripts/generate-llms-index.ts          # write indices
 *   npx tsx scripts/generate-llms-index.ts --check   # exit 1 if full index differs
 */

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { generateSectionIndex, readMetaJson } from './docs-utils.js';

const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

const CONTENT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'content');
const OUTPUT_DIR = path.resolve(new URL('.', import.meta.url).pathname, '..', 'dist');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'llms-index.md');

/** Return sorted list of content section directory names (e.g. ["bcs", "dapp-kit", "sui"]). */
function getContentSections(): string[] {
	return fs
		.readdirSync(CONTENT_DIR)
		.filter((name) => {
			const dir = path.join(CONTENT_DIR, name);
			if (!fs.statSync(dir).isDirectory()) return false;
			// Skip api-reference — it's auto-generated, not useful for LLM docs
			if (name === 'api-reference') return false;
			const meta = readMetaJson(dir);
			if (meta?.root === true) return true;
			if (!meta) {
				return fs.readdirSync(dir).some((f) => f.endsWith('.mdx'));
			}
			return false;
		})
		.sort();
}

/** Generate the full combined index across all sections. */
function generateFullIndex(sections: string[]): string {
	const lines: string[] = [];

	lines.push('# Sui TypeScript SDK Documentation');
	lines.push(
		'> Reference documentation for the @mysten/* TypeScript SDK packages for the Sui blockchain.',
	);
	lines.push('');

	for (const sectionName of sections) {
		const sectionDir = path.join(CONTENT_DIR, sectionName);
		lines.push(generateSectionIndex(sectionDir, `./${sectionName}`));
	}

	return lines.join('\n');
}

// Main
const checkMode = process.argv.includes('--check');
const sections = getContentSections();
const indexContent = generateFullIndex(sections);

if (checkMode) {
	if (!fs.existsSync(OUTPUT_FILE)) {
		console.error('ERROR: dist/llms-index.md does not exist. Run without --check to generate.');
		process.exit(1);
	}

	// Format in-memory content with prettier before comparing, since the on-disk
	// file was formatted by the build step.
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llms-index-'));
	const tmpFile = path.join(tmpDir, 'llms-index.md');
	fs.writeFileSync(tmpFile, indexContent);
	execFileSync(npxCmd, ['prettier', '--write', tmpFile], { stdio: 'ignore' });
	const formatted = fs.readFileSync(tmpFile, 'utf-8');
	fs.rmSync(tmpDir, { recursive: true });

	const existing = fs.readFileSync(OUTPUT_FILE, 'utf-8');
	if (existing !== formatted) {
		console.error(
			'ERROR: dist/llms-index.md is out of date. Run `npx tsx scripts/generate-llms-index.ts` to update.',
		);
		process.exit(1);
	}
	console.log('dist/llms-index.md is up to date.');
} else {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });

	// Write the full combined index
	fs.writeFileSync(OUTPUT_FILE, indexContent);
	execFileSync(npxCmd, ['prettier', '--write', OUTPUT_FILE], { stdio: 'ignore' });
	console.log(`Generated ${OUTPUT_FILE}`);

	// Write per-section indices into dist/<section>/llms-index.md
	for (const sectionName of sections) {
		const sectionDir = path.join(CONTENT_DIR, sectionName);
		const sectionIndex = generateSectionIndex(sectionDir, '.', '#');
		const sectionOutputDir = path.join(OUTPUT_DIR, sectionName);
		fs.mkdirSync(sectionOutputDir, { recursive: true });
		const sectionOutputFile = path.join(sectionOutputDir, 'llms-index.md');
		fs.writeFileSync(sectionOutputFile, sectionIndex);
	}
	execFileSync(npxCmd, ['prettier', '--write', `${OUTPUT_DIR}/**/llms-index.md`], {
		stdio: 'ignore',
	});
	console.log(`Generated per-section indices for ${sections.length} sections`);
}
