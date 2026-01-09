// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { Keypair } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { TransactionObjectArgument } from '@mysten/sui/transactions';
import { Transaction } from '@mysten/sui/transactions';
import {
	fromBase64,
	normalizeStructTag,
	normalizeSuiAddress,
	parseStructTag,
	toBase64,
} from '@mysten/sui/utils';

import type { ZkSendLinkBuilderOptions } from './builder.js';
import { ZkSendLinkBuilder } from './builder.js';
import type { LinkAssets } from './utils.js';
import type { ZkBagContractOptions } from './zk-bag.js';
import { getContractIds, ZkBag, ZkBagStruct } from './zk-bag.js';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';

export const CoinStruct = bcs.struct('Coin', {
	id: bcs.Address,
	balance: bcs.u64(),
});

const DEFAULT_ZK_SEND_LINK_OPTIONS = {
	host: 'https://api.slush.app',
	path: '/claim',
	network: 'mainnet' as const,
};

export type ZkSendLinkOptions = {
	claimApi?: string;
	keypair?: Keypair;
	client: ClientWithCoreApi;
	network?: string;
	host?: string;
	path?: string;
	address?: string;
	contract?: ZkBagContractOptions;
} & (
	| {
			address: string;
			keypair?: never;
	  }
	| {
			keypair: Keypair;
			address?: never;
	  }
);

export class ZkSendLink {
	address: string;
	keypair?: Keypair;
	creatorAddress?: string;
	assets?: LinkAssets;
	claimed?: boolean;
	claimedBy?: string;
	bagObject?: SuiClientTypes.GetDynamicFieldResponse['dynamicField'] | null;

	#client: ClientWithCoreApi;
	#contract: ZkBag<ZkBagContractOptions>;
	#network: string;
	#host: string;
	#path: string;
	#claimApi: string;

	constructor({
		network = DEFAULT_ZK_SEND_LINK_OPTIONS.network,
		client,
		keypair,
		contract,
		address,
		host = DEFAULT_ZK_SEND_LINK_OPTIONS.host,
		path = DEFAULT_ZK_SEND_LINK_OPTIONS.path,
		claimApi = `${host}/api`,
	}: ZkSendLinkOptions) {
		const resolvedContract = contract ?? getContractIds(network as 'mainnet' | 'testnet');
		if (!keypair && !address) {
			throw new Error('Either keypair or address must be provided');
		}

		this.#client = client;
		this.keypair = keypair;
		this.address = address ?? keypair!.toSuiAddress();
		this.#claimApi = claimApi;
		this.#network = network;
		this.#host = host;
		this.#path = path;

		this.#contract = new ZkBag(resolvedContract.packageId, resolvedContract);
	}

	static async fromUrl(
		url: string,
		options: Omit<ZkSendLinkOptions, 'keypair' | 'address' | 'isContractLink'>,
	) {
		const parsed = new URL(url);
		if (!parsed.hash.startsWith('#$')) {
			throw new Error('Invalid link URL');
		}
		const parsedNetwork = parsed.searchParams.get('network') === 'testnet' ? 'testnet' : 'mainnet';
		const network = options.network ?? parsedNetwork;

		const keypair = Ed25519Keypair.fromSecretKey(fromBase64(parsed.hash.slice(2)));
		const link = new ZkSendLink({
			...options,
			keypair,
			network,
			host: `${parsed.protocol}//${parsed.host}`,
			path: parsed.pathname,
		});

		await link.loadAssets();

		return link;
	}

	static async fromAddress(
		address: string,
		options: Omit<ZkSendLinkOptions, 'keypair' | 'address' | 'isContractLink'>,
	) {
		const link = new ZkSendLink({
			...options,
			address,
		});

		await link.loadAssets();

		return link;
	}

	async loadClaimedStatus() {
		await this.#loadBag({ loadAssets: false });
	}

	async loadAssets(
		options: {
			transaction?: SuiClientTypes.TransactionResult;
			loadAssets?: boolean;
			loadClaimedAssets?: boolean;
		} = {},
	) {
		await this.#loadBag(options);
	}

	async claimAssets(
		address: string,
		{
			reclaim,
			sign,
		}:
			| { reclaim?: false; sign?: never }
			| {
					reclaim: true;
					sign: (transaction: Uint8Array) => Promise<string>;
			  } = {},
	) {
		if (!this.keypair && !sign) {
			throw new Error('Cannot claim assets without links keypair');
		}

		if (this.claimed) {
			throw new Error('Assets have already been claimed');
		}

		if (!this.assets) {
			throw new Error(
				'Link assets could not be loaded.  Link has not been indexed or has already been claimed',
			);
		}

		if (!this.assets) {
			await this.#loadBag();
		}

		const tx = this.createClaimTransaction(address, { reclaim });

		const sponsored = await this.#createSponsoredTransaction(
			tx,
			address,
			reclaim ? address : this.keypair!.toSuiAddress(),
		);

		const bytes = fromBase64(sponsored.bytes);
		const signature = sign
			? await sign(bytes)
			: (await this.keypair!.signTransaction(bytes)).signature;

		const { digest } = await this.#executeSponsoredTransaction(sponsored, signature);

		const result = await this.#client.core.waitForTransaction({
			digest,
			include: {
				effects: true,
			},
		});

		if (result.FailedTransaction) {
			throw new Error(
				`Claim transaction failed: ${result.FailedTransaction.status.error?.message ?? 'Unknown error'}`,
			);
		}

		return result;
	}

	createClaimTransaction(
		address: string,
		{
			reclaim,
		}: {
			reclaim?: boolean;
		} = {},
	) {
		if (!this.keypair && !reclaim) {
			throw new Error('Cannot claim assets without the links keypair');
		}

		const tx = new Transaction();
		const sender = reclaim ? address : this.keypair!.toSuiAddress();
		tx.setSender(sender);

		const store = tx.object(this.#contract.ids.bagStoreId);
		const command = reclaim
			? this.#contract.reclaim({ arguments: [store, this.address] })
			: this.#contract.init_claim({ arguments: [store] });

		const [bag, proof] = tx.add(command);

		const objectsToTransfer: TransactionObjectArgument[] = [];

		const objects = [...(this.assets?.coins ?? []), ...(this.assets?.nfts ?? [])];

		for (const object of objects) {
			objectsToTransfer.push(
				this.#contract.claim({
					arguments: [
						bag,
						proof,
						tx.receivingRef({
							objectId: object.objectId,
							version: object.version,
							digest: object.digest,
						}),
					],
					typeArguments: [object.type],
				}),
			);
		}

		if (objectsToTransfer.length > 0) {
			tx.transferObjects(objectsToTransfer, address);
		}

		tx.add(this.#contract.finalize({ arguments: [bag, proof] }));

		return tx;
	}

	async createRegenerateTransaction(
		sender: string,
		options: Omit<ZkSendLinkBuilderOptions, 'sender'>,
	) {
		if (!this.assets) {
			await this.#loadBag();
		}

		if (this.claimed) {
			throw new Error('Assets have already been claimed');
		}

		const tx = new Transaction();
		tx.setSender(sender);

		const store = tx.object(this.#contract.ids.bagStoreId);

		const newLinkKp = Ed25519Keypair.generate();

		const newLink = new ZkSendLinkBuilder({
			...options,
			sender,
			client: this.#client,
			contract: this.#contract.ids,
			host: this.#host,
			path: this.#path,
			network: this.#network,
			keypair: newLinkKp,
		});

		const to = tx.pure.address(newLinkKp.toSuiAddress());

		tx.add(this.#contract.update_receiver({ arguments: [store, this.address, to] }));

		return {
			url: newLink.getLink(),
			transaction: tx,
		};
	}

	async #loadBagObject() {
		try {
			const bagField = await this.#client.core.getDynamicField({
				parentId: this.#contract.ids.bagStoreTableId,
				name: {
					type: 'address',
					bcs: bcs.Address.serialize(this.address).toBytes(),
				},
			});

			this.bagObject = bagField.dynamicField;

			if (this.bagObject) {
				this.claimed = false;
			}
		} catch {
			// Dynamic field not found - bag either doesn't exist or has been claimed
			this.bagObject = null;
			this.claimed = true;
		}
	}

	async #loadBag({
		loadAssets = true,
	}: {
		loadAssets?: boolean;
	} = {}) {
		if (!this.bagObject || !this.claimed) {
			await this.#loadBagObject();
		}

		if (!loadAssets) {
			return;
		}

		if (!this.bagObject) {
			return;
		}

		const itemIds = ZkBagStruct.parse(this.bagObject?.value.bcs).item_ids;

		this.creatorAddress = (this.bagObject as any)?.content?.fields?.value?.fields?.owner;

		if (!itemIds) {
			throw new Error('Invalid bag field');
		}

		const objectsResponse = await this.#client.core.getObjects({
			objectIds: itemIds,
			include: {
				content: true,
			},
		});

		this.assets = {
			balances: [],
			nfts: [],
			coins: [],
		};

		const balances = new Map<
			string,
			{
				coinType: string;
				amount: bigint;
			}
		>();

		objectsResponse.objects.forEach((object, i) => {
			if (object instanceof Error) {
				throw new Error(`Failed to load claimable object ${itemIds[i]}`);
			}

			const type = parseStructTag(normalizeStructTag(object.type));

			if (
				type.address === normalizeSuiAddress('0x2') &&
				type.module === 'coin' &&
				type.name === 'Coin'
			) {
				this.assets!.coins.push({
					objectId: object.objectId,
					type: object.type,
					version: object.version,
					digest: object.digest,
				});

				const amount = BigInt(CoinStruct.parse(object.content).balance);
				const coinType = normalizeStructTag(parseStructTag(object.type).typeParams[0]);
				if (!balances.has(coinType)) {
					balances.set(coinType, { coinType, amount });
				} else {
					balances.get(coinType)!.amount += amount;
				}
			} else {
				this.assets!.nfts.push({
					objectId: object.objectId,
					type: object.type,
					version: object.version,
					digest: object.digest,
				});
			}
		});

		this.assets.balances = [...balances.values()];
	}

	async #createSponsoredTransaction(tx: Transaction, claimer: string, sender: string) {
		return this.#fetch<{ digest: string; bytes: string }>('transaction-blocks/sponsor', {
			method: 'POST',
			body: JSON.stringify({
				network: this.#network,
				sender,
				claimer,
				transactionBlockKindBytes: toBase64(
					await tx.build({
						onlyTransactionKind: true,
						client: this.#client,
					}),
				),
			}),
		});
	}

	async #executeSponsoredTransaction(input: { digest: string; bytes: string }, signature: string) {
		return this.#fetch<{ digest: string }>(`transaction-blocks/sponsor/${input.digest}`, {
			method: 'POST',
			body: JSON.stringify({
				signature,
			}),
		});
	}

	async #fetch<T = unknown>(path: string, init: RequestInit): Promise<T> {
		const res = await fetch(`${this.#claimApi}/v1/${path}`, {
			...init,
			headers: {
				...init.headers,
				'Content-Type': 'application/json',
			},
		});

		if (!res.ok) {
			console.error(`${this.#claimApi}/v1/${path}`, await res.text());
			throw new Error(`Request to claim API failed with status code ${res.status}`);
		}

		const { data } = await res.json();

		return data as T;
	}
}
