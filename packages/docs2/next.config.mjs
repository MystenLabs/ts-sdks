// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	redirects: () => {
		return [
			{
				source: '/',
				destination: '/typescript',
				statusCode: 302,
			},
			{
				source: '/dapp-kit/zksend',
				destination: '/dapp-kit/stashed',
				statusCode: 302,
			},
		];
	},
};

export default withMDX(config);
