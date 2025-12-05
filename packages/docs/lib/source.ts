// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { loader } from 'fumadocs-core/source';

import { docs } from '@/.source/server';

export const source = loader(docs.toFumadocsSource(), {
	baseUrl: '/',
});
