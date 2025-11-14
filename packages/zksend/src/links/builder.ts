// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';
import type { Keypair, Signer } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { TransactionObjectArgument } from '@mysten/sui/transactions';
import { Transaction } from '@mysten/sui/transactions';
import { normalizeStructTag, normalizeSuiAddress, SUI_TYPE_ARG, toBase64 } from '@mysten/sui/utils';

import type { ZkBagContractOptions } from './zk-bag.js';
import { getContractIds, ZkBag } from './zk-bag.js';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';

export interface ZkSendLinkBuilderOptions {
	host?: string;
	path?: string;
	keypair?: Keypair;
	network?: 'mainnet' | 'testnet';
	client: ClientWithCoreApi;
	sender: string;
	contract?: ZkBagContractOptions;
}

const DEFAULT_ZK_SEND_LINK_OPTIONS = {
	host: 'https://my.slush.app',
	path: '/claim',
	network: 'mainnet' as const,
};

const SUI_COIN_TYPE = normalizeStructTag(SUI_TYPE_ARG);

export interface CreateZkSendLinkOptions {
	transaction?: Transaction;
}

export class ZkSendLinkBuilder {
	objectIds = new Set<string>();
	objectRefs: {
		ref: TransactionObjectArgument;
		type: string;
	}[] = [];
	balances = new Map<string, bigint>();
	sender: string;
	network: 'mainnet' | 'testnet';
	#host: string;
	#path: string;
	keypair: Keypair;
	#client: ClientWithCoreApi;
	#coinsByType = new Map<string, SuiClientTypes.CoinResponse[]>();
	#contract: ZkBag<ZkBagContractOptions>;

	constructor({
		host = DEFAULT_ZK_SEND_LINK_OPTIONS.host,
		path = DEFAULT_ZK_SEND_LINK_OPTIONS.path,
		keypair = new Ed25519Keypair(),
		network = DEFAULT_ZK_SEND_LINK_OPTIONS.network,
		client,
		sender,
		contract = getContractIds(network),
	}: ZkSendLinkBuilderOptions) {
		this.#host = host;
		this.#path = path;
		this.keypair = keypair;
		this.#client = client;
		this.sender = normalizeSuiAddress(sender);
		this.network = network;

		this.#contract = new ZkBag(contract.packageId, contract);
	}

	addClaimableMist(amount: bigint) {
		this.addClaimableBalance(SUI_COIN_TYPE, amount);
	}

	addClaimableBalance(coinType: string, amount: bigint) {
		const normalizedType = normalizeStructTag(coinType);
		this.balances.set(normalizedType, (this.balances.get(normalizedType) ?? 0n) + amount);
	}

	addClaimableObject(id: string) {
		this.objectIds.add(id);
	}

	addClaimableObjectRef(ref: TransactionObjectArgument, type: string) {
		this.objectRefs.push({ ref, type });
	}

	getLink(): string {
		const link = new URL(this.#host);
		link.pathname = this.#path;
		// NOTE: The $ prefix here is intentional, and not a typo, it is used to designate a contract-based link
		link.hash = `$${toBase64(decodeSuiPrivateKey(this.keypair.getSecretKey()).secretKey)}`;

		if (this.network !== 'mainnet') {
			link.searchParams.set('network', this.network);
		}

		return link.toString();
	}

	async create({
		signer,
		...options
	}: CreateZkSendLinkOptions & {
		signer: Signer;
		waitForTransaction?: boolean;
	}) {
		const tx = await this.createSendTransaction(options);

		const result = await signer.signAndExecuteTransaction({
			transaction: tx,
			client: this.#client,
		});

		if (!result.effects.status.success) {
			throw new Error(`Transaction failed: ${result.effects.status.error ?? 'Unknown error'}`);
		}

		if (options.waitForTransaction) {
			await this.#client.core.waitForTransaction({ digest: result.digest });
		}

		return result;
	}
	async createSendTransaction({ transaction = new Transaction() }: CreateZkSendLinkOptions = {}) {
		transaction.setSenderIfNotSet(this.sender);

		return ZkSendLinkBuilder.createLinks({
			transaction,
			network: this.network,
			client: this.#client,
			contract: this.#contract.ids,
			links: [this],
		});
	}

	async createSendToAddressTransaction({
		transaction = new Transaction(),
		address,
	}: CreateZkSendLinkOptions & {
		address: string;
	}) {
		const objectsToTransfer = (await this.#objectsToTransfer(transaction)).map((obj) => obj.ref);

		transaction.setSenderIfNotSet(this.sender);
		transaction.transferObjects(objectsToTransfer, address);

		return transaction;
	}

	async #objectsToTransfer(tx: Transaction) {
		const objectIDs = [...this.objectIds];
		const refsWithType = this.objectRefs.concat(
			(objectIDs.length > 0
				? await this.#client.core.listObjects({
						objectIds: objectIDs,
					})
				: { objects: [] }
			).objects.map((res, i) => {
				if (!('objectId' in res)) {
					throw new Error(`Failed to load object ${objectIDs[i]} (${res.message})`);
				}

				return {
					ref: tx.objectRef({
						version: res.version,
						digest: res.digest,
						objectId: res.objectId,
					}),
					type: res.type,
				};
			}),
		);

		for (const [coinType, amount] of this.balances) {
			if (coinType === SUI_COIN_TYPE) {
				const [sui] = tx.splitCoins(tx.gas, [amount]);
				refsWithType.push({
					ref: sui,
					type: `0x2::coin::Coin<${coinType}>`,
				} as never);
			} else {
				const coins = (await this.#getCoinsByType(coinType)).map((coin) => coin.objectId);

				if (coins.length > 1) {
					tx.mergeCoins(coins[0], coins.slice(1));
				}
				const [split] = tx.splitCoins(coins[0], [amount]);
				refsWithType.push({
					ref: split,
					type: `0x2::coin::Coin<${coinType}>`,
				});
			}
		}

		return refsWithType;
	}

	async #getCoinsByType(coinType: string) {
		if (this.#coinsByType.has(coinType)) {
			return this.#coinsByType.get(coinType)!;
		}

		const coins = await this.#client.core.listCoins({
			coinType,
			owner: this.sender,
		});

		this.#coinsByType.set(coinType, coins.objects);

		return coins.objects;
	}

	static async createLinks({
		links,
		network = 'mainnet',
		client,
		transaction = new Transaction(),
		contract: contractIds = getContractIds(network),
	}: {
		transaction?: Transaction;
		client: ClientWithCoreApi;
		network?: 'mainnet' | 'testnet';
		links: ZkSendLinkBuilder[];
		contract?: ZkBagContractOptions;
	}) {
		const contract = new ZkBag(contractIds.packageId, contractIds);
		const store = transaction.object(contract.ids.bagStoreId);

		const coinsByType = new Map<string, SuiClientTypes.CoinResponse[]>();
		const allIds = links.flatMap((link) => [...link.objectIds]);
		const sender = links[0].sender;
		transaction.setSenderIfNotSet(sender);

		await Promise.all(
			[...new Set(links.flatMap((link) => [...link.balances.keys()]))].map(async (coinType) => {
				const coins = await client.core.listCoins({
					coinType,
					owner: sender,
				});

				coinsByType.set(
					coinType,
					coins.objects.filter((coin) => !allIds.includes(coin.objectId)),
				);
			}),
		);

		const objectRefs = new Map<
			string,
			{
				ref: TransactionObjectArgument;
				type: string;
			}
		>();

		const pageSize = 50;
		let offset = 0;
		while (offset < allIds.length) {
			const chunk = allIds.slice(offset, offset + pageSize);
			offset += pageSize;

			const objects = await client.core.listObjects({
				objectIds: chunk,
			});

			for (const [i, res] of objects.objects.entries()) {
				if (!('objectId' in res)) {
					throw new Error(`Failed to load object ${chunk[i]} (${res.message})`);
				}

				objectRefs.set(chunk[i], {
					ref: transaction.objectRef({
						version: res.version,
						digest: res.digest,
						objectId: res.objectId,
					}),
					type: res.type!,
				});
			}
		}

		const mergedCoins = new Map<string, TransactionObjectArgument>([
			[SUI_COIN_TYPE, transaction.gas],
		]);

		for (const [coinType, coins] of coinsByType) {
			if (coinType === SUI_COIN_TYPE) {
				continue;
			}

			const [first, ...rest] = coins.map((coin) =>
				transaction.objectRef({
					objectId: coin.objectId,
					version: coin.version,
					digest: coin.digest,
				}),
			);
			if (rest.length > 0) {
				transaction.mergeCoins(first, rest);
			}
			mergedCoins.set(coinType, transaction.object(first));
		}

		for (const link of links) {
			const receiver = link.keypair.toSuiAddress();
			transaction.add(contract.new({ arguments: [store, receiver] }));

			link.objectRefs.forEach(({ ref, type }) => {
				transaction.add(
					contract.add({
						arguments: [store, receiver, ref],
						typeArguments: [type],
					}),
				);
			});

			link.objectIds.forEach((id) => {
				const object = objectRefs.get(id);
				if (!object) {
					throw new Error(`Object ${id} not found`);
				}
				transaction.add(
					contract.add({
						arguments: [store, receiver, object.ref],
						typeArguments: [object.type],
					}),
				);
			});
		}

		for (const [coinType, merged] of mergedCoins) {
			const linksWithCoin = links.filter((link) => link.balances.has(coinType));
			if (linksWithCoin.length === 0) {
				continue;
			}

			const balances = linksWithCoin.map((link) => link.balances.get(coinType)!);
			const splits = transaction.splitCoins(merged, balances);
			for (const [i, link] of linksWithCoin.entries()) {
				transaction.add(
					contract.add({
						arguments: [store, link.keypair.toSuiAddress(), splits[i]],
						typeArguments: [`0x2::coin::Coin<${coinType}>`],
					}),
				);
			}
		}

		return transaction;
	}
}
