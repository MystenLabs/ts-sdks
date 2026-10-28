// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path';
import { GenericContainer, getContainerRuntimeClient, Network, PullPolicy } from 'testcontainers';
import type { TestProject } from 'vitest/node';

declare module 'vitest' {
	export interface ProvidedContext {
		localnetPort: number;
		faucetPort: number;
		suiToolsContainerId: string;
	}
}

const DEFAULT_SUI_TOOLS_TAG = '16d2dc1e05edcf600320a82e17b9392edb0983a5';

export default async function setup(project: TestProject) {
	// The image must match the Docker host's architecture, which can differ from Node's.
	const runtime = await getContainerRuntimeClient();
	const arm = /^(arm64|aarch64)/.test(runtime.info.containerRuntime.architecture);
	const suiToolsTag =
		process.env.SUI_TOOLS_TAG || (arm ? `${DEFAULT_SUI_TOOLS_TAG}-arm64` : DEFAULT_SUI_TOOLS_TAG);
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

	const localnet = await new GenericContainer(`mysten/sui-tools:${suiToolsTag}`)
		.withCommand([
			'sui',
			'start',
			'--with-faucet',
			'--force-regenesis',
			`--with-indexer=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
		])
		.withCopyDirectoriesToContainer([
			{ source: resolve(__dirname, './data'), target: '/test-data' },
		])
		.withNetwork(network)
		.withExposedPorts(9000, 9123)
		.withLogConsumer((stream) => {
			stream.on('data', (data) => {
				console.log(data.toString());
			});
		})
		.start();

	project.provide('faucetPort', localnet.getMappedPort(9123));
	project.provide('localnetPort', localnet.getMappedPort(9000));
	project.provide('suiToolsContainerId', localnet.getId());
}
