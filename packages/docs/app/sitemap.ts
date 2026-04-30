// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MetadataRoute } from 'next';

import { source } from '@/lib/source';

const BASE_URL = 'https://sdk.mystenlabs.com';

export default function sitemap(): MetadataRoute.Sitemap {
	return source.getPages().map((page) => ({
		url: `${BASE_URL}${page.url}`,
		changeFrequency: 'weekly',
	}));
}
