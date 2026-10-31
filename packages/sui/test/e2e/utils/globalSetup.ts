// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { resolve } from 'path';
import {
	GenericContainer,
	getContainerRuntimeClient,
	Network,
	PullPolicy,
	type StartedTestContainer,
} from 'testcontainers';
import type { TestProject } from 'vitest/node';

import type { PrePublishedPackage } from './prePublish.js';
import { prePublishPackages } from './prePublish.js';

declare module 'vitest' {
	export interface ProvidedContext {
		localnetPort: number;
		graphqlPort: number;
		faucetPort: number;
		suiToolsContainerId: string;
		prePublishedPackages: Record<string, PrePublishedPackage>;
	}
}

const DEFAULT_SUI_TOOLS_TAG = 'd16b6a12e734629d1dc523d758a4f2a73c30b8c8';

export default async function setup(project: TestProject) {
	const runtime = await getContainerRuntimeClient();
	const arm = /^(arm64|aarch64)/.test(runtime.info.containerRuntime.architecture);
	const suiToolsTag =
		process.env.SUI_TOOLS_TAG || (arm ? `${DEFAULT_SUI_TOOLS_TAG}-arm64` : DEFAULT_SUI_TOOLS_TAG);

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
				'--with-graphql',
				`--with-indexer=postgres://postgres:postgrespw@${pg.getIpAddress(network.getName())}:5432/sui_indexer_v2`,
			])
			.withCopyDirectoriesToContainer([
				{ source: resolve(__dirname, '../data'), target: '/test-data' },
			])
			.withNetwork(network)
			.withExposedPorts(9000, 9123, 9124, 9125)
			.withStartupTimeout(180_000)
			.withLogConsumer((stream) => {
				stream.on('data', (data) => {
					console.log(data.toString());
				});
			})
			.start();
		cleanups.push(() => localnet.stop());

		await finishSetup(project, {
			localnet,
			localnetPort: localnet.getMappedPort(9000),
			faucetPort: localnet.getMappedPort(9123),
			graphqlPort: localnet.getMappedPort(9125),
		});
	} catch (error) {
		await teardown();
		throw error;
	}
	return teardown;
}

/** Waits until GraphQL answers a query with its indexed data. */
async function waitForGraphQL(port: number) {
	const deadline = Date.now() + 60_000;
	while (true) {
		try {
			const response = await fetch(`http://127.0.0.1:${port}/graphql`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ query: '{chainIdentifier}' }),
				signal: AbortSignal.timeout(1000),
			});
			if (response.ok && (await response.json()).data?.chainIdentifier) return;
		} catch {
			/* Not serving yet. */
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
	}: {
		localnet: StartedTestContainer;
		localnetPort: number;
		faucetPort: number;
		graphqlPort: number;
	},
) {
	await waitForGraphQL(graphqlPort);
	// A localnet image without GraphQL subscriptions fails setup rather than skipping tests.
	if (!(await probe('GraphQL subscriptions', () => supportsGraphQLSubscriptions(graphqlPort)))) {
		throw new Error(
			'`sui start --with-graphql` does not serve GraphQL subscriptions; use a newer sui-tools image',
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
