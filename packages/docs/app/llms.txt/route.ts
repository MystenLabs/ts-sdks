// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import * as fs from 'node:fs/promises';
import { remarkInclude } from 'fumadocs-mdx/config';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import remarkMdx from 'remark-mdx';
import remarkStringify from 'remark-stringify';
import { remarkNpm } from 'fumadocs-core/mdx-plugins';
import { source } from '@/lib/source';
import type { InferPageType } from 'fumadocs-core/source';

export const revalidate = false;

export async function GET() {
	const scan = source.getPages().map(getLLMText);
	const scanned = await Promise.all(scan);
	return new Response(scanned.join('\n\n'));
}

const processor = remark()
	.use(remarkMdx)
	.use(remarkInclude)
	.use(remarkGfm)
	.use(remarkNpm, { persist: { id: 'package-manager' } })
	.use(remarkStringify);

async function getLLMText(page: InferPageType<typeof source>) {
	const processed = await processor.process({
		path: page.absolutePath,
		value: await fs.readFile(page.absolutePath),
	});
	// note: it doesn't escape frontmatter, it's up to you.
	return `# ${page.data.title}
URL: ${page.url}
${processed.value}`;
}
