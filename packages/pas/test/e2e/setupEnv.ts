// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// @ts-ignore

import { inject } from 'vitest';

Object.entries({
	FAUCET_URL: `http://localhost:${inject('faucetPort')}`,
	FULLNODE_URL: `http://localhost:${inject('localnetPort')}`,
	GRAPHQL_URL: `http://localhost:${inject('graphqlPort')}/graphql`,
}).forEach(([key, value]) => {
	// @ts-ignore-next-line
	process.env[key] = value;
});
