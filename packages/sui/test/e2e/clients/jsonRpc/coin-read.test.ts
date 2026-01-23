// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { fromBase64 } from '@mysten/bcs';

import { beforeAll, describe, expect, it } from 'vitest';

import { Transaction } from '../../../../src/transactions/index.js';
import { setup, TestToolbox } from '../../utils/setup.js';

// Magic number used to identify fake address balance coins (last 20 bytes of the digest)
// See: sui/crates/sui-types/src/coin_reservation.rs
const COIN_RESERVATION_MAGIC = new Uint8Array([
	0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac, 0xac,
	0xac, 0xac, 0xac, 0xac,
]);

function isCoinReservationDigest(digestBase64: string): boolean {
	const digestBytes = fromBase64(digestBase64);
	// Check if the last 20 bytes match the magic number
	const last20Bytes = digestBytes.slice(12, 32);
	return last20Bytes.every((byte, i) => byte === COIN_RESERVATION_MAGIC[i]);
}

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

	describe('Address Balance', () => {
		it('filters out fake address balance coins from listCoins', async () => {
			// Deposit some SUI to the address balance
			const depositAmount = 100_000_000n;
			const depositTx = new Transaction();
			const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);
			depositTx.moveCall({
				target: '0x2::coin::send_funds',
				typeArguments: ['0x2::sui::SUI'],
				arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
			});

			const { digest } = await toolbox.jsonRpcClient.signAndExecuteTransaction({
				transaction: depositTx,
				signer: toolbox.keypair,
			});
			await toolbox.jsonRpcClient.waitForTransaction({ digest });

			// Now list coins - should NOT include the fake address balance coin
			const coins = await toolbox.jsonRpcClient.getCoins({
				owner: toolbox.address(),
			});

			// Verify no coins have the magic digest (indicating a fake address balance coin)
			for (const coin of coins.data) {
				expect(isCoinReservationDigest(coin.digest)).toBe(false);
			}
		});

		it('returns correct addressBalance in getBalance', async () => {
			// Deposit some SUI to the address balance
			const depositAmount = 50_000_000n;
			const depositTx = new Transaction();
			const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);
			depositTx.moveCall({
				target: '0x2::coin::send_funds',
				typeArguments: ['0x2::sui::SUI'],
				arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
			});

			const { digest } = await toolbox.jsonRpcClient.signAndExecuteTransaction({
				transaction: depositTx,
				signer: toolbox.keypair,
			});
			await toolbox.jsonRpcClient.waitForTransaction({ digest });

			// Get balance via core API - addressBalance should be non-zero
			const balance = await toolbox.jsonRpcClient.core.getBalance({
				owner: toolbox.address(),
			});

			// The addressBalance should reflect the deposited amount (may have more from previous deposits)
			expect(BigInt(balance.balance.addressBalance)).toBeGreaterThanOrEqual(depositAmount);

			// coinBalance should be totalBalance - addressBalance
			const expectedCoinBalance =
				BigInt(balance.balance.balance) - BigInt(balance.balance.addressBalance);
			expect(BigInt(balance.balance.coinBalance)).toBe(expectedCoinBalance);
		});

		it('core listCoins filters out fake address balance coins', async () => {
			// Deposit some SUI to the address balance
			const depositAmount = 25_000_000n;
			const depositTx = new Transaction();
			const [coinToDeposit] = depositTx.splitCoins(depositTx.gas, [depositAmount]);
			depositTx.moveCall({
				target: '0x2::coin::send_funds',
				typeArguments: ['0x2::sui::SUI'],
				arguments: [coinToDeposit, depositTx.pure.address(toolbox.address())],
			});

			const { digest } = await toolbox.jsonRpcClient.signAndExecuteTransaction({
				transaction: depositTx,
				signer: toolbox.keypair,
			});
			await toolbox.jsonRpcClient.waitForTransaction({ digest });

			// Now list coins via core API - should NOT include the fake address balance coin
			const coins = await toolbox.jsonRpcClient.core.listCoins({
				owner: toolbox.address(),
			});

			// Verify no coins have the magic digest (indicating a fake address balance coin)
			for (const coin of coins.objects) {
				expect(isCoinReservationDigest(coin.digest)).toBe(false);
			}
		});
	});
});
