// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'path';
import {
	GenericContainer,
	getContainerRuntimeClient,
	Network,
	PullPolicy,
	Wait,
	type StartedTestContainer,
} from 'testcontainers';
import type { TestProject } from 'vitest/node';

import type { PrePublishedPackage } from './prePublish.js';
import { prePublishPackages } from './prePublish.js';

declare module 'vitest' {
	export interface ProvidedContext {
		localnetPort: number;
		graphqlPort: number;
		graphqlSubscriptions: boolean;
		faucetPort: number;
		suiToolsContainerId: string;
		prePublishedPackages: Record<string, PrePublishedPackage>;
	}
}

const DEFAULT_SUI_TOOLS_TAG = '16d2dc1e05edcf600320a82e17b9392edb0983a5';

type GraphQLService =
	| { kind: 'binary'; path: string }
	| { kind: 'image'; image: string }
	| { kind: 'localnet'; explicit: boolean };

/**
 * `sui start --with-graphql` does not configure the checkpoint stream that GraphQL subscriptions
 * require, so a separate GraphQL service from the same release runs instead. The published image
 * is amd64 only and stalls under emulation, so ARM Docker hosts fall back to the localnet service
 * unless SUI_GRAPHQL_BINARY or SUI_GRAPHQL_IMAGE is set.
 */
function graphqlService(arm: boolean, suiToolsTag: string): GraphQLService {
	if (process.env.SUI_GRAPHQL === 'localnet') return { kind: 'localnet', explicit: true };
	if (process.env.SUI_GRAPHQL_BINARY) {
		return { kind: 'binary', path: resolve(process.env.SUI_GRAPHQL_BINARY) };
	}
	if (process.env.SUI_GRAPHQL_IMAGE) return { kind: 'image', image: process.env.SUI_GRAPHQL_IMAGE };
	if (arm) return { kind: 'localnet', explicit: false };
	return {
		kind: 'image',
		image: `mysten/sui-indexer-alt-graphql:${suiToolsTag.replace(/-arm64$/, '')}`,
	};
}

export default async function setup(project: TestProject) {
	const runtime = await getContainerRuntimeClient();
	const arm = /^(arm64|aarch64)/.test(runtime.info.containerRuntime.architecture);
	const suiToolsTag =
		process.env.SUI_TOOLS_TAG || (arm ? `${DEFAULT_SUI_TOOLS_TAG}-arm64` : DEFAULT_SUI_TOOLS_TAG);
	const graphqlConfig = graphqlService(arm, suiToolsTag);
	const separateGraphQL = graphqlConfig.kind !== 'localnet';

	// Stopped in reverse order on teardown, and when setup fails part-way.
	const cleanups: (() => Promise<unknown> | void)[] = [];
	const teardown = async () => {
		for (const cleanup of cleanups.splice(0).reverse()) {
			try {
				await cleanup();
			} catch (error) {
				console.warn('e2e teardown step failed', error);
			}
		}
	};

	try {
		console.log('Starting test containers');
		const network = await new Network().start();
		cleanups.push(() => network.stop());

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
		cleanups.push(() => pg.stop());

		const localnet = await new GenericContainer(`mysten/sui-tools:${suiToolsTag}`)
			// .withPullPolicy(PullPolicy.alwaysPull())
			.withCommand([
				'sui',
				'start',
				'--with-faucet',
				'--force-regenesis',
				separateGraphQL ? '--with-consistent-store' : '--with-graphql',
				`--with-indexer=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
			])
			.withCopyDirectoriesToContainer([
				{ source: resolve(__dirname, '../data'), target: '/test-data' },
			])
			.withNetwork(network)
			.withExposedPorts(9000, 9123, 9124, ...(separateGraphQL ? [] : [9125]))
			.withStartupTimeout(180_000)
			.withLogConsumer((stream) => {
				stream.on('data', (data) => {
					console.log(data.toString());
				});
			})
			.start();
		cleanups.push(() => localnet.stop());

		const faucetPort = localnet.getMappedPort(9123);
		const localnetPort = localnet.getMappedPort(9000);
		const fullnodeUrl = `http://${localnet.getIpAddress(network.getName())}:9000`;
		let graphqlPort: number;
		if (graphqlConfig.kind === 'binary') {
			// Native builds avoid amd64 emulation on ARM developer machines.
			graphqlPort = await unusedPort();
			const graphqlProcess = spawn(
				graphqlConfig.path,
				[
					'rpc',
					`--database-url=postgres://postgres:postgrespw@127.0.0.1:${pg.getMappedPort(5432)}/sui_indexer_v2`,
					`--fullnode-rpc-url=http://127.0.0.1:${localnetPort}`,
					`--ledger-grpc-url=http://127.0.0.1:${localnetPort}`,
					'--enable-list-apis=true',
					`--consistent-store-url=http://127.0.0.1:${localnet.getMappedPort(9124)}`,
					`--checkpoint-stream-url=http://127.0.0.1:${localnetPort}`,
					`--rpc-listen-address=127.0.0.1:${graphqlPort}`,
					'--metrics-address=127.0.0.1:0',
					`--config=${resolve(__dirname, '../data/graphql.toml')}`,
					`--indexer-config=${resolve(__dirname, '../data/graphql-indexer.toml')}`,
				],
				{ stdio: 'inherit' },
			);
			const stopGraphQL = () => {
				graphqlProcess.kill('SIGTERM');
			};
			process.once('exit', stopGraphQL);
			cleanups.push(() => {
				process.removeListener('exit', stopGraphQL);
				stopGraphQL();
			});
			let startupError: Error | undefined;
			graphqlProcess.once('error', (error) => {
				startupError = error;
			});
			await waitForGraphQL(graphqlPort, () => {
				if (startupError) throw startupError;
				if (graphqlProcess.exitCode !== null) {
					throw new Error('GraphQL process exited during startup');
				}
			});
		} else if (graphqlConfig.kind === 'image') {
			const graphql = await new GenericContainer(graphqlConfig.image)
				.withPlatform(process.env.SUI_GRAPHQL_PLATFORM || 'linux/amd64')
				.withCommand([
					'sui-indexer-alt-graphql',
					'rpc',
					`--database-url=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
					`--fullnode-rpc-url=${fullnodeUrl}`,
					`--ledger-grpc-url=${fullnodeUrl}`,
					'--enable-list-apis=true',
					`--consistent-store-url=http://${localnet.getIpAddress(network.getName())}:9124`,
					`--checkpoint-stream-url=${fullnodeUrl}`,
					'--rpc-listen-address=0.0.0.0:9125',
					'--config=/graphql.toml',
					'--indexer-config=/graphql-indexer.toml',
				])
				.withNetwork(network)
				.withCopyFilesToContainer([
					{ source: resolve(__dirname, '../data/graphql.toml'), target: '/graphql.toml' },
					{
						source: resolve(__dirname, '../data/graphql-indexer.toml'),
						target: '/graphql-indexer.toml',
					},
				])
				.withExposedPorts(9125)
				.withWaitStrategy(Wait.forListeningPorts())
				.withStartupTimeout(180_000)
				.withLogConsumer((stream) => stream.on('data', (data) => console.log(data.toString())))
				.start();
			cleanups.push(() => graphql.stop());
			graphqlPort = graphql.getMappedPort(9125);
			await waitForGraphQL(graphqlPort);
		} else {
			graphqlPort = localnet.getMappedPort(9125);
		}

		await finishSetup(project, {
			localnet,
			localnetPort,
			faucetPort,
			graphqlPort,
			// The separate service exists to serve subscriptions, and CI must not skip them quietly.
			requireSubscriptions:
				separateGraphQL ||
				(!!process.env.CI && !(graphqlConfig.kind === 'localnet' && graphqlConfig.explicit)),
		});
	} catch (error) {
		await teardown();
		throw error;
	}
	return teardown;
}

/** Waits until GraphQL answers a query with its indexed data. `check` throws to stop waiting. */
async function waitForGraphQL(port: number, check?: () => void) {
	const deadline = Date.now() + 180_000;
	while (true) {
		check?.();
		try {
			const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ query: '{chainIdentifier}' }),
				signal: AbortSignal.timeout(1000),
			});
			if (response.ok && (await response.json()).data?.chainIdentifier) return;
		} catch {
			/* Wait until the server has its indexed watermarks. */
		}
		if (Date.now() >= deadline) throw new Error('GraphQL startup timed out');
		await new Promise((resolve) => setTimeout(resolve, 250));
	}
}

async function finishSetup(
	project: TestProject,
	{
		localnet,
		localnetPort,
		faucetPort,
		graphqlPort,
		requireSubscriptions,
	}: {
		localnet: StartedTestContainer;
		localnetPort: number;
		faucetPort: number;
		graphqlPort: number;
		requireSubscriptions: boolean;
	},
) {
	const graphqlSubscriptions = await probe('GraphQL subscriptions', () =>
		supportsGraphQLSubscriptions(graphqlPort),
	);
	if (!graphqlSubscriptions) {
		if (requireSubscriptions) {
			throw new Error('The GraphQL service does not serve subscriptions');
		}
		console.warn(
			'GraphQL subscription tests will be skipped: `sui start --with-graphql` does not serve subscriptions. Set SUI_GRAPHQL_BINARY to run them (see test/e2e/README.md).',
		);
	}
	const containerId = localnet.getId();

	// Set up the default sui config so `sui keytool` and `sui move build` commands work.
	// The config file is checked in at data/localnet-client.yaml and copied into the container.
	const runtimeClient = await getContainerRuntimeClient();
	const container = runtimeClient.container.getById(containerId);
	await runtimeClient.container.exec(container, ['mkdir', '-p', '/root/.sui/sui_config']);
	await runtimeClient.container.exec(container, [
		'bash',
		'-c',
		"echo '[]' > /root/.sui/sui_config/sui.keystore && cp /test-data/localnet-client.yaml /root/.sui/sui_config/client.yaml",
	]);

	project.provide('faucetPort', faucetPort);
	project.provide('localnetPort', localnetPort);
	project.provide('graphqlPort', graphqlPort);
	project.provide('graphqlSubscriptions', graphqlSubscriptions);
	project.provide('suiToolsContainerId', containerId);

	// Pre-publish shared packages
	const prePublished = await prePublishPackages({
		fullnodeUrl: `http://127.0.0.1:${localnetPort}`,
		faucetUrl: `http://127.0.0.1:${faucetPort}`,
		containerId,
	});
	project.provide('prePublishedPackages', prePublished);
}

/**
 * Runs a capability probe. A probe returns false only for a valid answer that shows the capability
 * is missing; anything else is an operational failure, retried and then thrown, so a broken server
 * fails setup instead of silently skipping tests.
 */
async function probe(name: string, run: () => Promise<boolean>, attempts = 3): Promise<boolean> {
	for (let attempt = 1; ; attempt++) {
		try {
			return await run();
		} catch (error) {
			if (attempt >= attempts) {
				throw new Error(`Capability probe "${name}" failed`, { cause: error });
			}
			await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
		}
	}
}

async function unusedPort(): Promise<number> {
	const server = createServer();
	await new Promise<void>((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Failed to allocate GraphQL port');
	await new Promise<void>((resolve, reject) =>
		server.close((error) => (error ? reject(error) : resolve())),
	);
	return address.port;
}

async function supportsGraphQLSubscriptions(port: number): Promise<boolean> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 10_000);
	try {
		const response = await fetch(`http://127.0.0.1:${port}/graphql/subscriptions`, {
			method: 'POST',
			headers: { 'content-type': 'application/json', accept: 'text/event-stream' },
			body: JSON.stringify({ query: 'subscription { checkpoints { cursor } }' }),
			signal: controller.signal,
		});
		// A server error or a failed request is retried; any other response decides.
		if (response.status >= 500) throw new Error(`GraphQL responded with HTTP ${response.status}`);
		return response.ok && !!response.headers.get('content-type')?.startsWith('text/event-stream');
	} finally {
		clearTimeout(timeout);
		controller.abort();
	}
}
