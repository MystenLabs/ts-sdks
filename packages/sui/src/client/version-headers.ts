// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { PACKAGE_VERSION } from '../version.js';

export const RPC_SCHEMA_DATE = '2026-09-04';

export const CLIENT_VERSION_HEADERS = {
	'client-sdk-type': 'typescript',
	'client-sdk-version': PACKAGE_VERSION,
	'client-rpc-schema-date': RPC_SCHEMA_DATE,
} as const;
