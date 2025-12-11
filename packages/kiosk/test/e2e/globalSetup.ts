// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path';
import { GenericContainer, Network, PullPolicy } from 'testcontainers';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
	export interface ProvidedContext {
		localnetPort: number;
		graphqlPort: number;
		grpcPort: number;
		faucetPort: number;
		suiToolsContainerId: string;
	}
}

const SUI_TOOLS_TAG =
	process.env.SUI_TOOLS_TAG ||
	(process.arch === 'arm64'
		? '62eeb2716b43d1248efcf19c208086840f5a0695-arm64'
		: '62eeb2716b43d1248efcf19c208086840f5a0695');

export default async function setup(project: TestProject) {
	console.log('Starting test containers');
	const network = await new Network().start();

	const pg = await new GenericContainer('postgres')
		.withEnvironment({
			POSTGRES_USER: 'postgres',
			POSTGRES_PASSWORD: 'postgrespw',
			POSTGRES_DB: 'sui_indexer_v2',
		})
		.withCommand(['-c', 'max_connections=500'])
		.withExposedPorts(5432)
		.withNetwork(network)
		.withPullPolicy(PullPolicy.alwaysPull())
		.start();

	const localnet = await new GenericContainer(`mysten/sui-tools:${SUI_TOOLS_TAG}`)
		.withCommand([
			'sui',
			'start',
			'--with-faucet',
			'--force-regenesis',
			'--with-graphql',
			`--with-indexer=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
		])
		.withCopyDirectoriesToContainer([
			{ source: resolve(__dirname, './data'), target: '/test-data' },
		])
		.withNetwork(network)
		.withExposedPorts(9000, 9123, 9124, 9125)
		.withLogConsumer((stream) => {
			stream.on('data', (data) => {
				console.log(data.toString());
			});
		})
		.start();

	project.provide('faucetPort', localnet.getMappedPort(9123));
	project.provide('localnetPort', localnet.getMappedPort(9000));
	project.provide('graphqlPort', localnet.getMappedPort(9125));
	project.provide('grpcPort', localnet.getMappedPort(9000)); // gRPC runs on same host as JSON-RPC
	project.provide('suiToolsContainerId', localnet.getId());
}
