// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { serve } from '@hono/node-server';
import type { SuiClientTypes } from '@mysten/sui/client';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { Hono } from 'hono';

import {
	analyzers,
	createAnalyzer,
	createSponsor,
	defaults,
	gasBudget,
	userSignatureMatchesSender,
} from '../../src/index.js';

const FULLNODE_URL = process.env.FULLNODE_URL ?? 'https://fullnode.testnet.sui.io:443';
const SPONSOR_KEY = requiredEnv('SPONSOR_KEY');
const ALLOWED_TARGET = parseMoveTarget(requiredEnv('ALLOWED_TARGET'));
const MAX_GAS_BUDGET = BigInt(process.env.MAX_GAS_BUDGET ?? 50_000_000);
const PORT = Number.parseInt(process.env.PORT ?? '3000', 10);

const client = new SuiGrpcClient({
	network: 'testnet',
	baseUrl: FULLNODE_URL,
});

const onlyAllowedTargetCall = createAnalyzer({
	dependencies: { data: analyzers.data },
	analyze:
		() =>
		({ data }) => {
			if (data.commands.length !== 1) {
				return {
					result: [
						{
							code: 'EXPECTED_ONE_COMMAND',
							message: 'Transaction must contain exactly one command.',
						},
					],
				};
			}

			const [command] = data.commands;
			if (
				command.$kind !== 'MoveCall' ||
				normalizeSuiAddress(command.MoveCall.package) !== ALLOWED_TARGET.packageId ||
				command.MoveCall.module !== ALLOWED_TARGET.module ||
				command.MoveCall.function !== ALLOWED_TARGET.function
			) {
				return {
					result: [
						{
							code: 'TARGET_CALL_REQUIRED',
							message: `The only command must be a MoveCall to ${ALLOWED_TARGET.target}.`,
						},
					],
				};
			}

			return { result: null };
		},
});

const sponsor = createSponsor({
	signer: Ed25519Keypair.fromSecretKey(SPONSOR_KEY),
	client,
	validate: [
		defaults(),
		userSignatureMatchesSender(),
		gasBudget({ max: MAX_GAS_BUDGET }),
		onlyAllowedTargetCall,
	],
});

type SponsorExecutionInclude = Omit<SuiClientTypes.TransactionInclude, 'effects'> & {
	effects?: never;
};

type SponsorRequest = {
	transaction: string;
	userSignature: string | string[];
	include?: SponsorExecutionInclude;
};

const app = new Hono();

// Expose the sponsor address the client sets as gas owner before building / signing bytes.
app.get('/config', (c) =>
	c.json({
		ok: true,
		sponsor: sponsor.address,
		allowedTarget: ALLOWED_TARGET.target,
		maxGasBudget: MAX_GAS_BUDGET.toString(),
	}),
);

// Accept already-built, user-signed transaction bytes; validate policy, co-sign, and execute.
app.post('/sponsor', async (c) => {
	const body = await c.req.json<SponsorRequest>();

	const result = await sponsor.signAndExecuteTransaction({
		transaction: body.transaction,
		userSignature: body.userSignature,
		include: body.include,
	});

	switch (result.$kind) {
		case 'Rejected':
			return c.json({ ok: false, reason: result.reason, issues: result.issues }, 403);
		case 'FailedTransaction':
			return c.json(
				{
					ok: false,
					error: 'Transaction executed but failed on-chain.',
					digest: result.FailedTransaction.digest,
					transaction: result.FailedTransaction,
				},
				502,
			);
		case 'Transaction':
			return c.json({
				ok: true,
				digest: result.Transaction.digest,
				transaction: result.Transaction,
			});
	}
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
	console.log(`Sponsor server listening on http://127.0.0.1:${info.port}`);
	console.log(`Sponsor address: ${sponsor.address}`);
	console.log(`Allowed target: ${ALLOWED_TARGET.target}`);
});

function parseMoveTarget(target: string) {
	const [packageId, module, fn] = target.split('::');
	if (!packageId || !module || !fn) {
		throw new Error('ALLOWED_TARGET must use the format packageId::module::function.');
	}
	return {
		target: `${normalizeSuiAddress(packageId)}::${module}::${fn}`,
		packageId: normalizeSuiAddress(packageId),
		module,
		function: fn,
	};
}

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}
