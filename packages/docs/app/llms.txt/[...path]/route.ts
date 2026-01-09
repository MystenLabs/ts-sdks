// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { source } from '@/lib/source';
import type { InferPageType } from 'fumadocs-core/source';

export const revalidate = false;

export async function GET(_request: Request, props: { params: Promise<{ path: string[] }> }) {
	const params = await props.params;
	const folderPath = '/' + params.path.join('/');

	const pages = source
		.getPages()
		.filter((page) => page.url === folderPath || page.url.startsWith(folderPath + '/'))
		.sort((a, b) => {
			// Index page first, then alphabetically
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
		},
	});
}

async function getLLMText(page: InferPageType<typeof source>) {
	const processed = await page.data.getText?.('processed');
	return `# ${page.data.title} (${page.url})\n\n${processed ?? ''}`;
}
