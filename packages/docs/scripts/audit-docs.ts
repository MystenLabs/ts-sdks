// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/**
 * Deterministic docs audit pipeline.
 *
 * Layers:
 *   1. Base checks   – frontmatter, staleness, links, code fences, TODOs, word count
 *   2. Goal checklist – evaluates goal.requires from page frontmatter
 *   3. GEO/AEO       – questions and answer field presence
 *
 * Usage:
 *   node scripts/audit-docs.ts                  # JSON to stdout
 *   node scripts/audit-docs.ts --summary        # compact table to stderr, JSON to stdout
 *   node scripts/audit-docs.ts --only-failures  # only pages with issues
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import grayMatter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOCS_ROOT = path.resolve(__dirname, '..');
const CONTENT_ROOT = path.resolve(DOCS_ROOT, 'content');
const REPO_ROOT = path.resolve(DOCS_ROOT, '..', '..');

// ─── Helpers ────────────────────────────────────────────────────────────────

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

function stripCodeBlocks(text: string): string {
	return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]+`/g, '');
}

function stripFrontmatter(raw: string): string {
	return raw.replace(/^---[\s\S]*?---\n?/, '');
}

function countWords(text: string): number {
	const cleaned = stripCodeBlocks(stripFrontmatter(text));
	const words = cleaned.match(/[a-zA-Z0-9]+/g);
	return words ? words.length : 0;
}

interface Heading {
	level: number;
	text: string;
}

function getHeadings(body: string): Heading[] {
	const headings: Heading[] = [];
	for (const line of body.split('\n')) {
		const m = line.match(/^(#{1,6})\s+(.*)$/);
		if (m) {
			headings.push({ level: m[1].length, text: m[2].trim() });
		}
	}
	return headings;
}

function getGitLastModified(filePath: string): Date | null {
	try {
		const ts = execFileSync('git', ['log', '-1', '--format=%at', '--', filePath], {
			cwd: REPO_ROOT,
			encoding: 'utf8',
			stdio: ['pipe', 'pipe', 'pipe'],
		}).trim();
		if (!ts) return null;
		return new Date(parseInt(ts, 10) * 1000);
	} catch {
		return null;
	}
}

function daysSince(date: Date | null): number | null {
	if (!date) return null;
	return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Base Checks ────────────────────────────────────────────────────────────

interface BaseResult {
	frontmatter: { pass: boolean; missing: string[] };
	lastModified: string | null;
	staleDays: number | null;
	wordCount: number;
	codeFences: { pass: boolean; count: number };
	todos: { line: number; text: string }[];
	issues: string[];
	geo: { hasQuestions: boolean; questionCount: number; hasAnswer: boolean };
}

function runBaseChecks(
	filePath: string,
	raw: string,
	data: Record<string, unknown>,
	body: string,
): BaseResult {
	const lastModified = getGitLastModified(filePath);
	const staleDays = daysSince(lastModified);
	const wordCount = countWords(raw);

	const required = ['title', 'description', 'keywords'];
	const missing = required.filter((f) => !data[f]);
	const frontmatter = { pass: missing.length === 0, missing };

	const fences = body.match(/^```/gm) || [];
	const codeFences = { pass: fences.length % 2 === 0, count: fences.length };

	const todos: { line: number; text: string }[] = [];
	const lines = body.split('\n');
	for (let i = 0; i < lines.length; i++) {
		if (/\b(TODO|FIXME|HACK|PLACEHOLDER|XXX)\b/i.test(lines[i])) {
			todos.push({ line: i + 1, text: lines[i].trim() });
		}
	}

	const issues: string[] = [];
	if (!frontmatter.pass) issues.push(`Missing frontmatter: ${frontmatter.missing.join(', ')}`);
	if (!codeFences.pass) issues.push(`Unclosed code fence (${codeFences.count} backtick lines)`);
	if (todos.length > 0) issues.push(`${todos.length} TODO/FIXME marker(s)`);
	if (wordCount < 50) issues.push(`Very short page (${wordCount} words)`);

	const hasQuestions = Array.isArray(data.questions) && data.questions.length > 0;
	const hasAnswer = typeof data.answer === 'string' && (data.answer as string).trim().length > 0;

	return {
		frontmatter,
		lastModified: lastModified ? lastModified.toISOString().slice(0, 10) : null,
		staleDays,
		wordCount,
		codeFences,
		todos,
		issues,
		geo: { hasQuestions, questionCount: hasQuestions ? (data.questions as string[]).length : 0, hasAnswer },
	};
}

// ─── Goal Checklist ─────────────────────────────────────────────────────────

interface GoalCheck {
	label: string;
	pass: boolean;
	detail?: string;
}

interface GoalResult {
	description: string | null;
	allPass: boolean;
	checks: GoalCheck[];
}

interface GoalRequirement {
	label?: string;
	pattern?: string;
	min?: number;
	headings?: (string | { pattern: string })[];
	links_to?: string[];
	has_tables?: boolean | number;
	has_images?: boolean;
	has_frontmatter?: string[];
	min_words?: number;
	has_questions?: boolean;
	has_answer?: boolean;
	answer_in_intro?: number;
	question_headings?: number;
	steps_present?: number;
	code_explanation_ratio?: number;
}

interface Goal {
	description?: string;
	requires?: GoalRequirement[];
}

function evaluateGoalRequires(
	goal: Goal | undefined,
	body: string,
	data: Record<string, unknown>,
	headings: Heading[],
): GoalResult | null {
	if (!goal?.requires) return null;

	const results: GoalCheck[] = [];

	for (const req of goal.requires) {
		const result: GoalCheck = { label: req.label || '(unlabeled)', pass: false };

		if (req.pattern !== undefined && req.min !== undefined) {
			const re = new RegExp(req.pattern, 'gi');
			const matches = body.match(re) || [];
			result.pass = matches.length >= req.min;
			result.detail = `found ${matches.length}, need >= ${req.min}`;
		} else if (req.headings) {
			const missing: string[] = [];
			for (const h of req.headings) {
				const hPattern = typeof h === 'string' ? h : h.pattern;
				const re = new RegExp(hPattern, 'i');
				const found = headings.some((hd) => re.test(hd.text));
				if (!found) missing.push(hPattern);
			}
			result.pass = missing.length === 0;
			result.detail = missing.length > 0 ? `missing headings: ${missing.join(', ')}` : 'all present';
		} else if (req.has_frontmatter) {
			const missing = req.has_frontmatter.filter((f) => !data[f]);
			result.pass = missing.length === 0;
			result.detail = missing.length > 0 ? `missing: ${missing.join(', ')}` : 'all present';
		} else if (req.min_words !== undefined) {
			const wc = countWords(body);
			result.pass = wc >= req.min_words;
			result.detail = `${wc} words, need >= ${req.min_words}`;
		} else if (req.has_questions !== undefined) {
			const has = Array.isArray(data.questions) && data.questions.length > 0;
			result.pass = req.has_questions ? has : !has;
			result.detail = !has ? 'no questions field' : `${(data.questions as string[]).length} question(s)`;
		} else if (req.has_answer !== undefined) {
			const has = typeof data.answer === 'string' && data.answer.trim().length > 0;
			result.pass = req.has_answer ? has : !has;
			result.detail = has ? `${(data.answer as string).trim().length} chars` : 'no answer field';
		} else if (req.steps_present !== undefined) {
			const steps = (body.match(/^\d+\.\s/gm) || []).length;
			const min = typeof req.steps_present === 'number' ? req.steps_present : 3;
			result.pass = steps >= min;
			result.detail = `${steps} numbered step(s), need >= ${min}`;
		} else if (req.code_explanation_ratio !== undefined) {
			const totalWords = (body.match(/[a-zA-Z0-9]+/g) || []).length;
			const explanationWords = countWords(body);
			const ratio = totalWords > 0 ? explanationWords / totalWords : 1;
			const minRatio = req.code_explanation_ratio;
			result.pass = ratio >= minRatio;
			result.detail = `ratio ${ratio.toFixed(2)}, need >= ${minRatio}`;
		}

		results.push(result);
	}

	const allPass = results.every((r) => r.pass);
	return { description: goal.description || null, allPass, checks: results };
}

// ─── Main ───────────────────────────────────────────────────────────────────

function main(): void {
	const args = process.argv.slice(2);
	const showSummary = args.includes('--summary');
	const onlyFailures = args.includes('--only-failures');

	const files = findMdxFiles(CONTENT_ROOT);

	const allPages = files.map((filePath) => {
		const raw = fs.readFileSync(filePath, 'utf8');
		const { data, content: body } = grayMatter(raw);
		const relPath = path.relative(CONTENT_ROOT, filePath);
		return { filePath, relativePath: relPath, raw, data, body };
	});

	const pageResults = allPages.map((page) => {
		const headings = getHeadings(page.body);
		const base = runBaseChecks(page.filePath, page.raw, page.data, page.body);
		const goal = evaluateGoalRequires(page.data.goal as Goal, page.body, page.data, headings);

		return {
			path: page.relativePath,
			title: (page.data.title as string) || null,
			base,
			goal,
		};
	});

	const output = {
		summary: {
			totalPages: pageResults.length,
			pagesWithIssues: pageResults.filter((p) => p.base.issues.length > 0).length,
			pagesWithGoal: pageResults.filter((p) => p.goal !== null).length,
			pagesPassingGoal: pageResults.filter((p) => p.goal?.allPass).length,
			pagesFailingGoal: pageResults.filter((p) => p.goal && !p.goal.allPass).length,
			geo: {
				pagesWithQuestions: pageResults.filter((p) => p.base.geo?.hasQuestions).length,
				pagesWithAnswer: pageResults.filter((p) => p.base.geo?.hasAnswer).length,
				pagesWithBoth: pageResults.filter((p) => p.base.geo?.hasQuestions && p.base.geo?.hasAnswer)
					.length,
				pagesWithNeither: pageResults.filter(
					(p) => !p.base.geo?.hasQuestions && !p.base.geo?.hasAnswer,
				).length,
			},
		},
		pages: onlyFailures
			? pageResults.filter((p) => p.base.issues.length > 0 || (p.goal && !p.goal.allPass))
			: pageResults,
	};

	console.log(JSON.stringify(output, null, 2));

	if (showSummary) {
		console.error('\n── Audit Summary ──────────────────────────────────────');
		console.error(`Total pages:       ${output.summary.totalPages}`);
		console.error(`Pages with issues: ${output.summary.pagesWithIssues}`);
		console.error(`Pages with goal:   ${output.summary.pagesWithGoal}`);
		console.error(`  Passing:         ${output.summary.pagesPassingGoal}`);
		console.error(`  Failing:         ${output.summary.pagesFailingGoal}`);

		const geo = output.summary.geo;
		console.error(`GEO/AEO readiness:`);
		console.error(`  With questions:  ${geo.pagesWithQuestions}`);
		console.error(`  With answer:     ${geo.pagesWithAnswer}`);
		console.error(`  With both:       ${geo.pagesWithBoth}`);
		console.error(`  With neither:    ${geo.pagesWithNeither}`);

		const goalFailures = pageResults.filter((p) => p.goal && !p.goal.allPass);
		if (goalFailures.length > 0) {
			console.error('\nGoal checklist failures:');
			for (const p of goalFailures) {
				console.error(`  ${p.path}`);
				for (const check of p.goal!.checks.filter((c) => !c.pass)) {
					console.error(`    ✗ ${check.label}: ${check.detail}`);
				}
			}
		}

		console.error('──────────────────────────────────────────────────────\n');
	}

	const hasIssues = output.summary.pagesWithIssues > 0 || output.summary.pagesFailingGoal > 0;
	process.exit(hasIssues ? 1 : 0);
}

main();
