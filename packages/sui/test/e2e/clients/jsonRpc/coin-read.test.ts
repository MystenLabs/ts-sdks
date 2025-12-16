// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { beforeAll, describe, expect, it } from 'vitest';

import { Transaction } from '../../../../src/transactions';
import { setup, TestToolbox } from '../../utils/setup';

describe('CoinRead API', () => {
	let toolbox: TestToolbox;
	let publishToolbox: TestToolbox;
	let packageId: string;
	let testType: string;

	beforeAll(async () => {
		[toolbox, publishToolbox] = await Promise.all([setup(), setup()]);
		packageId = await publishToolbox.getPackage('test_data', { normalized: false });
		testType = packageId + '::test::TEST';

		// Get the TreasuryCap shared object to mint TEST coins
		const treasuryCapId = publishToolbox.getSharedObject('test_data', 'TreasuryCap<TEST>');
		if (!treasuryCapId) {
			throw new Error('TreasuryCap not found in pre-published package');
		}

		// Mint TEST coins to publishToolbox address (2 coins: 5 and 6 = 11 total)
		const mintTx = new Transaction();
		mintTx.moveCall({
			target: `${packageId}::test::mint`,
			arguments: [
				mintTx.object(treasuryCapId),
				mintTx.pure.u64(5),
				mintTx.pure.address(publishToolbox.address()),
			],
		});
		mintTx.moveCall({
			target: `${packageId}::test::mint`,
			arguments: [
				mintTx.object(treasuryCapId),
				mintTx.pure.u64(6),
				mintTx.pure.address(publishToolbox.address()),
			],
		});

		const { digest } = await publishToolbox.jsonRpcClient.signAndExecuteTransaction({
			transaction: mintTx,
			signer: publishToolbox.keypair,
		});
		await publishToolbox.jsonRpcClient.waitForTransaction({ digest });
	});

	it('Get coins with/without type', async () => {
		const suiCoins = await toolbox.jsonRpcClient.getCoins({
			owner: toolbox.address(),
		});
		expect(suiCoins.data.length).toEqual(5);

		const testCoins = await toolbox.jsonRpcClient.getCoins({
			owner: publishToolbox.address(),
			coinType: testType,
		});
		expect(testCoins.data.length).toEqual(2);

		const allCoins = await toolbox.jsonRpcClient.getAllCoins({
			owner: toolbox.address(),
		});
		expect(allCoins.data.length).toEqual(5);
		expect(allCoins.hasNextPage).toEqual(false);

		const publisherAllCoins = await toolbox.jsonRpcClient.getAllCoins({
			owner: publishToolbox.address(),
		});
		expect(publisherAllCoins.data.length).toEqual(3);
		expect(publisherAllCoins.hasNextPage).toEqual(false);

		//test paging with limit
		const someSuiCoins = await toolbox.jsonRpcClient.getCoins({
			owner: toolbox.address(),
			limit: 3,
		});
		expect(someSuiCoins.data.length).toEqual(3);
		expect(someSuiCoins.nextCursor).toBeTruthy();
	});

	it('Get balance with/without type', async () => {
		const suiBalance = await toolbox.jsonRpcClient.getBalance({
			owner: toolbox.address(),
		});
		expect(suiBalance.coinType).toEqual('0x2::sui::SUI');
		expect(suiBalance.coinObjectCount).toEqual(5);
		expect(Number(suiBalance.totalBalance)).toBeGreaterThan(0);

		const testBalance = await toolbox.jsonRpcClient.getBalance({
			owner: publishToolbox.address(),
			coinType: testType,
		});
		expect(testBalance.coinType).toEqual(testType);
		expect(testBalance.coinObjectCount).toEqual(2);
		expect(Number(testBalance.totalBalance)).toEqual(11);

		const allBalances = await toolbox.jsonRpcClient.getAllBalances({
			owner: publishToolbox.address(),
		});
		expect(allBalances.length).toEqual(2);
	});

	it('Get total supply', async () => {
		const testSupply = await toolbox.jsonRpcClient.getTotalSupply({
			coinType: testType,
		});
		expect(Number(testSupply.value)).toBeGreaterThanOrEqual(11);
	});
});
