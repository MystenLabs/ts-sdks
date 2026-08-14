// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Validate docs page frontmatter against the canonical JSON Schema
 * (packages/docs/frontmatter.schema.json).
 *
 * Uses gray-matter for full YAML parsing (the custom matter() in docs-utils.ts
 * doesn't support nested objects needed for goal checks).
 *
 * Usage:
 *   node scripts/validate-frontmatter.ts                 # validate all pages
 *   node scripts/validate-frontmatter.ts --summary       # human-readable summary
 *
 * Exit code is non-zero if any validated page fails schema validation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import Ajv from 'ajv/dist/2020.js';
import grayMatter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_ROOT = path.resolve(__dirname, '..');
const CONTENT_ROOT = path.resolve(DOCS_ROOT, 'content');
const SCHEMA_PATH = path.resolve(DOCS_ROOT, 'frontmatter.schema.json');

function findMdxFiles(dir: string): string[] {
	const results: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (['node_modules', '.next', 'dist'].includes(entry.name)) continue;
			results.push(...findMdxFiles(full));
		} else if (entry.name.endsWith('.mdx')) {
			results.push(full);
		}
	}
	return results;
}

function normalizeDates(value: unknown): unknown {
	if (value instanceof Date) return value.toISOString();
	if (Array.isArray(value)) return value.map(normalizeDates);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) out[k] = normalizeDates(v);
		return out;
	}
	return value;
}

interface AjvError {
	keyword: string;
	instancePath: string;
	message?: string;
	params?: Record<string, unknown>;
}

function formatErrors(errors: AjvError[] | null | undefined): string[] {
	if (!errors) return [];

	const oneOfPaths = new Set(
		errors
			.filter((e) => e.keyword === 'oneOf' || e.keyword === 'anyOf')
			.map((e) => e.instancePath),
	);

	const seen = new Set<string>();
	const out: string[] = [];
	for (const e of errors) {
		const loc = e.instancePath || '(root)';
		if (oneOfPaths.has(e.instancePath) && e.keyword === 'required' && e.params?.missingProperty) {
			continue;
		}

		let msg = `${loc} ${e.message}`;
		if (e.keyword === 'additionalProperties' && e.params?.additionalProperty) {
			msg = `${loc} has unknown property "${e.params.additionalProperty}"`;
		} else if (e.keyword === 'oneOf' || e.keyword === 'anyOf') {
			msg = `${loc} must match exactly one goal check type`;
		}
		if (!seen.has(msg)) {
			seen.add(msg);
			out.push(msg);
		}
	}
	return out;
}

function main(): void {
	const args = process.argv.slice(2);
	const showSummary = args.includes('--summary');

	const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
	const ajv = new Ajv({ allErrors: true, strict: false });
	const validate = ajv.compile(schema);

	const files = findMdxFiles(CONTENT_ROOT);
	const failures: { path: string; errors: string[] }[] = [];
	let checked = 0;

	for (const filePath of files) {
		const relPath = path.relative(CONTENT_ROOT, filePath);
		checked++;

		let data: Record<string, unknown>;
		try {
			({ data } = grayMatter(fs.readFileSync(filePath, 'utf8')));
			data = normalizeDates(data) as Record<string, unknown>;
		} catch (err) {
			failures.push({
				path: relPath,
				errors: [`frontmatter parse error: ${(err as Error).message}`],
			});
			continue;
		}

		const valid = validate(data);
		if (!valid) {
			failures.push({ path: relPath, errors: formatErrors(validate.errors as AjvError[]) });
		}
	}

	const output = { checked, failed: failures.length, failures };

	if (showSummary) {
		console.error('\n── Frontmatter Schema Validation ──────────────────────');
		console.error(`Pages checked: ${checked}`);
		console.error(`Pages failing: ${failures.length}`);
		if (failures.length > 0) {
			console.error('');
			for (const f of failures) {
				console.error(`  ✗ ${f.path}`);
				for (const err of f.errors) console.error(`      - ${err}`);
			}
		} else {
			console.error('All pages conform to the frontmatter schema. ✓');
		}
		console.error('────────────────────────────────────────────────────────\n');
	} else {
		console.log(JSON.stringify(output, null, 2));
	}

	process.exit(failures.length > 0 ? 1 : 0);
}

main();
