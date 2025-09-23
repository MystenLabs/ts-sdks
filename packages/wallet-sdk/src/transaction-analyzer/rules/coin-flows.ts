// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { normalizeStructTag } from '@mysten/sui/utils';
import type { Analyzer } from '../analyzer.js';
import { bcs } from '@mysten/sui/bcs';
import type { AnalyzedCommand, AnalyzedCommandArgument } from './commands.js';

export interface CoinFlow {
	coinType: string;
	amount: bigint;
}

export const coinFlowAnalyzer: Analyzer<CoinFlow[]> = () => async (analyzer) => {
	const [data, commands, inputs, coins, gasCoins] = await analyzer.getAll(
		'data',
		'commands',
		'inputs',
		'coins',
		'gasCoins',
	);

	const trackedCoins = new Map<string, TrackedCoin>();

	trackedCoins.set(
		'gas',
		new TrackedCoin(
			normalizeStructTag('0x2::sui::SUI'),
			gasCoins.reduce((a, c) => a + c.balance, 0n),
			true,
		),
	);

	if (data.gasData.budget) {
		trackedCoins.get('gas')!.remainingBalance -= BigInt(data.gasData.budget);
	} else {
		analyzer.addIssue({ message: 'Gas budget not set in Transaction' });
	}

	for (const input of inputs) {
		if (input.$kind === 'Object' && coins[input.object.id]) {
			const coin = coins[input.object.id];
			trackedCoins.set(`input:${input.index}`, new TrackedCoin(coin.coinType, coin.balance, true));
		}
	}

	for (const command of commands) {
		switch (command.$kind) {
			case 'SplitCoins':
				splitCoin(command);
				break;
			case 'MergeCoins':
				mergeCoins(command);
				break;
			case 'TransferObjects':
				transferObjects(command);
				break;
			case 'MakeMoveVec':
				command.elements.forEach((el) => {
					const tracked = getTrackedCoin(el);
					tracked?.consume();
				});
				break;
			case 'MoveCall':
				command.arguments.forEach((arg) => {
					const tracked = getTrackedCoin(arg);
					tracked?.consume();
				});
				break;
			case 'Upgrade':
			case 'Publish':
				break;
			default:
				throw new Error(`Unsupported command type: ${command.$kind}`);
		}
	}

	const outflows: Record<string, CoinFlow> = {};

	for (const coin of trackedCoins.values()) {
		if (!coin.owned) {
			continue;
		}
		if (!outflows[coin.coinType]) {
			outflows[coin.coinType] = { coinType: coin.coinType, amount: 0n };
		}

		outflows[coin.coinType].amount += coin.initialBalance - coin.remainingBalance;
	}

	return Object.values(outflows);

	function getTrackedCoin(ref: AnalyzedCommandArgument): TrackedCoin | null {
		switch (ref.$kind) {
			case 'GasCoin':
				return trackedCoins.get('gas') ?? null;
			case 'Object':
				return trackedCoins.get(`input:${ref.index}`) ?? null;
			case 'Result':
				return trackedCoins.get(`result:${ref.index[0]},${ref.index[1]}`) ?? null;
			case 'Unknown':
			case 'Pure':
				return null;
		}
	}

	function splitCoin(command: Extract<AnalyzedCommand, { $kind: 'SplitCoins' }>) {
		const coin = getTrackedCoin(command.coin);

		if (!coin) {
			return;
		}
		// If any amounts are dynamic we need to assume the coin is fully consumed
		if (!command.amounts.every((a) => a.$kind === 'Pure')) {
			coin.consume();
			return;
		}

		const amounts = command.amounts.map((a) => {
			if (a.$kind !== 'Pure') {
				throw new Error('Expected pure value');
			}
			return BigInt(bcs.u64().fromBase64(a.bytes));
		});

		coin.remainingBalance -= amounts.reduce((a, b) => a + b, 0n);

		amounts.forEach((amount, i) => {
			trackedCoins.set(
				`result:${command.index},${i}`,
				new TrackedCoin(coin.coinType, amount, false),
			);
		});
	}

	function mergeCoins(command: Extract<AnalyzedCommand, { $kind: 'MergeCoins' }>) {
		const sources = command.sources.map(getTrackedCoin);

		for (const src of sources) {
			src?.consume();
		}

		const dest = getTrackedCoin(command.destination);

		if (!dest) {
			return;
		}

		dest.remainingBalance += sources.reduce((a, c) => a + (c?.remainingBalance ?? 0n), 0n);
	}

	function transferObjects(command: Extract<AnalyzedCommand, { $kind: 'TransferObjects' }>) {
		const address =
			command.address.$kind === 'Pure' ? bcs.Address.fromBase64(command.address.bytes) : null;

		for (const obj of command.objects) {
			const tracked = getTrackedCoin(obj);

			// If coin is transferred to the sender, we can track the transfer in the gas coin
			if (tracked && address && data.sender === address) {
				trackedCoins.get('gas')!.remainingBalance += tracked.remainingBalance;
			}

			tracked?.consume();
		}
	}
};

class TrackedCoin {
	coinType: string;
	initialBalance: bigint;
	remainingBalance: bigint;
	owned: boolean;
	consumed = false;

	constructor(coinType: string, balance: bigint, owned: boolean) {
		this.coinType = coinType;
		this.initialBalance = balance;
		this.remainingBalance = balance;
		this.owned = owned;
	}

	consume() {
		this.remainingBalance = 0n;
		this.consumed = true;
	}
}
