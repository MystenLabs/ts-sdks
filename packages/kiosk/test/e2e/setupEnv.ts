// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { inject } from 'vitest';

Object.entries({
	FAUCET_URL: `http://localhost:${inject('faucetPort')}`,
	FULLNODE_URL: `http://localhost:${inject('localnetPort')}`,
	GRAPHQL_URL: `http://localhost:${inject('graphqlPort')}/graphql`,
	GRPC_URL: `http://localhost:${inject('grpcPort')}`,
}).forEach(([key, value]) => {
	process.env[key] = value;
});
