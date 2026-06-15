// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fileURLToPath } from 'node:url';
import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	// Pin the workspace root so Next doesn't infer it from a stray lockfile
	// outside the repo. Resolves to the ts-sdks monorepo root.
	turbopack: {
		root: fileURLToPath(new URL('../..', import.meta.url)),
	},
	serverExternalPackages: [
		'ts-morph',
		'typescript',
		'oxc-transform',
		'@shikijs/twoslash',
		'fumadocs-docgen',
	],
	rewrites: () => {
		return [
			{
				source: '/:path*/llms.txt',
				destination: '/llms.txt/:path*',
			},
			{
				source: '/:path*.md',
				destination: '/api/md/:path*',
			},
		];
	},
	redirects: () => {
		return [
			{
				source: '/',
				destination: '/sui',
				statusCode: 302,
			},
			{
				source: '/typescript/:path*',
				destination: '/sui/:path*',
				statusCode: 302,
			},
			{
				source: '/dapp-kit/zksend',
				destination: '/dapp-kit/slush',
				statusCode: 302,
			},
			{
				source: '/dapp-kit/stashed',
				destination: '/dapp-kit/slush',
				statusCode: 302,
			},
		];
	},
};

export default withMDX(config);
