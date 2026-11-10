// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';
import { describe, expect, it } from 'vitest';

import { ZkSendLink } from '../src/links/claim.js';
import { isClaimTransaction } from '../src/links/utils.js';
import { TESTNET_CONTRACT_IDS } from '../src/links/zk-bag.js';

const RECIPIENT = normalizeSuiAddress('0x123');
const COIN_TYPES = ['0x2::sui::SUI', '0x123::token::TOKEN'].map(normalizeStructTag);

function setup({ coins = true, nfts = true } = {}) {
	const link = new ZkSendLink({
		client: {} as ClientWithCoreApi,
		keypair: Ed25519Keypair.generate(),
		network: 'testnet',
	});
	const object = (id: string, type: string) => ({
		objectId: normalizeSuiAddress(id),
		type,
		version: '1',
		digest: '11111111111111111111111111111111',
	});
	link.assets = {
		balances: [],
		coins: coins
			? COIN_TYPES.map((type, i) => object(`0x${i + 10}`, `0x2::coin::Coin<${type}>`))
			: [],
		nfts: nfts ? [object('0x20', '0x123::nft::NFT')] : [],
	};
	return link;
}

describe('claim transactions', () => {
	it.each([false, true])('deposits coins and transfers NFTs (reclaim: %s)', (reclaim) => {
		const link = setup();
		const tx = link.createClaimTransaction(RECIPIENT, { reclaim });
		const { commands, inputs, sender } = tx.getData();
		expect(sender).toBe(reclaim ? RECIPIENT : link.keypair!.toSuiAddress());
		expect(commands[0].MoveCall?.function).toBe(reclaim ? 'reclaim' : 'init_claim');
		expect(commands.at(-1)?.MoveCall?.function).toBe('finalize');

		const deposits = commands.flatMap((command) =>
			command.MoveCall?.function === 'send_funds' ? [command.MoveCall] : [],
		);
		expect(deposits.map((call) => call.typeArguments)).toEqual(COIN_TYPES.map((type) => [type]));
		for (const deposit of deposits) {
			expect(deposit.package).toBe(normalizeSuiAddress('0x2'));
			expect(deposit.module).toBe('coin');
			const [coin, recipient] = deposit.arguments;
			expect(coin.$kind).toBe('Result');
			if (coin.$kind !== 'Result' || recipient.$kind !== 'Input') {
				throw new Error('Expected claim result and recipient input');
			}
			expect(commands[coin.Result].MoveCall?.function).toBe('claim');
			expect(inputs[recipient.Input].Pure?.bytes).toBe(bcs.Address.serialize(RECIPIENT).toBase64());
		}
		const transfers = commands.flatMap((command) =>
			command.TransferObjects ? [command.TransferObjects] : [],
		);
		expect(transfers).toHaveLength(1);
		expect(transfers[0].objects).toHaveLength(1);
		const nft = transfers[0].objects[0];
		if (nft.$kind !== 'Result') throw new Error('Expected NFT claim result');
		expect(commands[nft.Result].MoveCall?.typeArguments).toEqual(['0x123::nft::NFT']);
		expect(isClaimTransaction(tx, TESTNET_CONTRACT_IDS)).toBe(true);
	});

	it.each([
		{ coins: true, nfts: false },
		{ coins: false, nfts: true },
	])('recognizes claims with %o', (options) => {
		const tx = setup(options).createClaimTransaction(RECIPIENT);
		expect(isClaimTransaction(tx, TESTNET_CONTRACT_IDS)).toBe(true);
		expect(tx.getData().commands.some((command) => command.TransferObjects)).toBe(options.nfts);
	});

	it('keeps coin objects available in composable claims', () => {
		const link = setup({ nfts: false });
		const tx = new Transaction();
		const { init, assets, finalize } = link.claimFlow();
		tx.add(init);
		tx.transferObjects(
			assets.map((asset) => asset.argument),
			RECIPIENT,
		);
		tx.add(finalize);
		expect(assets.map((asset) => asset.type)).toEqual(link.assets!.coins.map((coin) => coin.type));
		expect(
			tx.getData().commands.some((command) => command.MoveCall?.function === 'send_funds'),
		).toBe(false);
		expect(isClaimTransaction(tx, TESTNET_CONTRACT_IDS)).toBe(true);
	});

	it('rejects deposits of input objects', () => {
		const tx = new Transaction();
		tx.moveCall({
			target: '0x2::coin::send_funds',
			typeArguments: [COIN_TYPES[0]],
			arguments: [tx.object('0x999'), tx.pure.address(RECIPIENT)],
		});
		expect(isClaimTransaction(tx, TESTNET_CONTRACT_IDS)).toBe(false);
	});

	it.each(['0x3::coin::send_funds', '0x2::balance::send_funds', '0x2::coin::burn'])(
		'rejects unrelated calls to %s',
		(target) => {
			const tx = setup().createClaimTransaction(RECIPIENT);
			tx.moveCall({ target });
			expect(isClaimTransaction(tx, TESTNET_CONTRACT_IDS)).toBe(false);
		},
	);
});
