// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { source } from '@/lib/source';
import type { InferPageType } from 'fumadocs-core/source';

export const revalidate = false;

export async function GET(request: Request, props: { params: Promise<{ path?: string[] }> }) {
	const params = await props.params;
	const pathSegments = params.path ?? [];

	// Root /llms.txt — serve structured index
	if (pathSegments.length === 0) {
		const url = new URL(request.url);
		const baseUrl = `${url.protocol}//${url.host}`;
		return buildIndex(baseUrl);
	}

	// /llms.txt/:path — serve section content
	const folderPath = '/' + pathSegments.join('/');

	const pages = source
		.getPages()
		.filter((page) => page.url === folderPath || page.url.startsWith(folderPath + '/'))
		.sort((a, b) => {
			if (a.url === folderPath) return -1;
			if (b.url === folderPath) return 1;
			return a.url.localeCompare(b.url);
		});

	if (pages.length === 0) {
		return new Response('Not found', { status: 404 });
	}

	const texts = await Promise.all(pages.map(getLLMText));
	return new Response(texts.join('\n\n---\n\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=0, must-revalidate',
		},
	});
}

function buildIndex(baseUrl: string) {
	const pages = source.getPages().sort((a, b) => a.url.localeCompare(b.url));

	const sections: Record<string, { title: string; url: string; description?: string }[]> = {};

	for (const page of pages) {
		const parts = page.url.replace(/^\//, '').split('/');
		const section = parts[0] || 'General';
		if (!sections[section]) sections[section] = [];
		sections[section].push({
			title: page.data.title,
			url: page.url,
			description: page.data.description,
		});
	}

	const lines: string[] = [];
	lines.push('# Sui TypeScript SDK Documentation');
	lines.push('');
	lines.push(
		'> Reference documentation for the @mysten/* TypeScript SDK packages for the Sui blockchain.',
	);
	lines.push('');

	for (const [section, sectionPages] of Object.entries(sections).sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		lines.push(`## ${section}`);
		lines.push('');
		for (const page of sectionPages) {
			const desc = page.description ? `: ${page.description}` : '';
			lines.push(`- [${page.title}](${baseUrl}${page.url}.md)${desc}`);
		}
		lines.push('');
	}

	return new Response(lines.join('\n'), {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=0, must-revalidate',
		},
	});
}

async function getLLMText(page: InferPageType<typeof source>) {
	const processed = await page.data.getText?.('processed');
	return `# ${page.data.title} (${page.url})\n\n${processed ?? ''}`;
}
