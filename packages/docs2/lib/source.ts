// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { loader } from 'fumadocs-core/source';
import { createMDXSource } from 'fumadocs-mdx';

import { docs, meta } from '@/.source';

export const source = loader({
	baseUrl: '/docs',
	source: createMDXSource(docs, meta),
});
