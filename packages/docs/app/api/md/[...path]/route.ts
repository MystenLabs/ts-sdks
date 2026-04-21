// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { source } from '@/lib/source';

export const revalidate = false;

export async function GET(_request: Request, props: { params: Promise<{ path: string[] }> }) {
	const params = await props.params;
	const pagePath = '/' + params.path.join('/');

	const page = source.getPages().find((p) => p.url === pagePath);

	if (!page) {
		return new Response('Not found', { status: 404 });
	}

	const processed = await page.data.getText?.('processed');
	const directive = '> For the complete documentation index, see [llms.txt](/llms.txt)\n\n';
	const content = `# ${page.data.title}\n\n${page.data.description ? `${page.data.description}\n\n` : ''}${processed ?? ''}`;

	return new Response(directive + content, {
		headers: {
			'Content-Type': 'text/markdown; charset=utf-8',
			'Cache-Control': 'public, max-age=0, must-revalidate',
		},
	});
}
