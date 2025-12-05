// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { source } from '@/lib/source';
import type { InferPageType } from 'fumadocs-core/source';

export const revalidate = false;

export async function GET() {
	const scan = source.getPages().map(getLLMText);
	const scanned = await Promise.all(scan);
	return new Response(scanned.join('\n\n'));
}

async function getLLMText(page: InferPageType<typeof source>) {
	const processed = await page.data.getText?.('processed');
	return `# ${page.data.title} (${page.url})\n\n${processed ?? ''}`;
}
