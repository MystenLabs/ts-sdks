// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { ClientWithCoreApi, SuiClientRegistration } from '@mysten/sui/client';
import type { Keypair } from '@mysten/sui/cryptography';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import type { Transaction } from '@mysten/sui/transactions';
import { fromBase64 } from '@mysten/sui/utils';

import { ZkSendLink } from './links/claim.js';
import { ZkSendLinkBuilder } from './links/builder.js';
import type { ZkBagContractOptions } from './links/zk-bag.js';
import { getContractIds } from './links/zk-bag.js';

export type ZkSendCompatibleClient = ClientWithCoreApi;

export interface ZkSendOptions<Name extends string = 'zksend'> {
	name?: Name;
	host?: string;
	path?: string;
	claimApi?: string;
	contract?: ZkBagContractOptions;
}

export interface LinkBuilderOptions {
	sender: string;
	keypair?: Keypair;
}

export type LoadLinkOptions =
	| {
			address: string;
			keypair?: never;
	  }
	| {
			keypair: Keypair;
			address?: never;
	  };

function getDefaultContractIds(clientNetwork: string): ZkBagContractOptions {
	if (clientNetwork === 'mainnet' || clientNetwork === 'testnet') {
		return getContractIds(clientNetwork);
	}
	throw new Error(
		`zkSend only has built-in contract IDs for mainnet and testnet. For network "${clientNetwork}", you must provide a custom contract option.`,
	);
}

export class ZkSendClient {
	#client: ZkSendCompatibleClient;
	#network: string;
	#host: string;
	#path: string;
	#claimApi: string;
	#contract: ZkBagContractOptions;

	constructor(client: ZkSendCompatibleClient, options: Omit<ZkSendOptions, 'name'> = {}) {
		this.#client = client;
		this.#network = client.network;
		this.#host = options.host ?? 'https://my.slush.app';
		this.#path = options.path ?? '/claim';
		this.#claimApi = options.claimApi ?? 'https://api.slush.app/api';
		this.#contract = options.contract ?? getDefaultContractIds(client.network);
	}

	linkBuilder(options: LinkBuilderOptions): ZkSendLinkBuilder {
		return new ZkSendLinkBuilder({
			client: this.#client,
			sender: options.sender,
			keypair: options.keypair,
			network: this.#network,
			host: this.#host,
			path: this.#path,
			contract: this.#contract,
		});
	}

	async createLinks(options: {
		links: ZkSendLinkBuilder[];
		transaction?: Transaction;
	}): Promise<Transaction> {
		return ZkSendLinkBuilder.createLinks({
			links: options.links,
			transaction: options.transaction,
			client: this.#client,
			network: this.#network,
			contract: this.#contract,
		});
	}

	/**
	 * Get a link without loading its assets (synchronous)
	 */
	getLink(options: LoadLinkOptions): ZkSendLink {
		return new ZkSendLink({
			client: this.#client,
			network: this.#network,
			host: this.#host,
			path: this.#path,
			claimApi: this.#claimApi,
			contract: this.#contract,
			...options,
		});
	}

	/**
	 * Load a link and its assets
	 */
	async loadLink(options: LoadLinkOptions): Promise<ZkSendLink> {
		const link = this.getLink(options);
		await link.loadAssets();
		return link;
	}

	/**
	 * Get a link from a URL without loading assets (synchronous)
	 */
	getLinkFromUrl(url: string): ZkSendLink {
		const parsed = new URL(url);
		if (!parsed.hash.startsWith('#$')) {
			throw new Error('Invalid link URL');
		}

		const parsedNetwork = parsed.searchParams.get('network') === 'testnet' ? 'testnet' : 'mainnet';

		if (parsedNetwork !== this.#network) {
			throw new Error(
				`Link network "${parsedNetwork}" does not match client network "${this.#network}"`,
			);
		}

		const keypair = Ed25519Keypair.fromSecretKey(fromBase64(parsed.hash.slice(2)));

		return new ZkSendLink({
			client: this.#client,
			keypair,
			network: this.#network,
			host: `${parsed.protocol}//${parsed.host}`,
			path: parsed.pathname,
			claimApi: this.#claimApi,
			contract: this.#contract,
		});
	}

	/**
	 * Load a link from a URL and its assets
	 */
	async loadLinkFromUrl(url: string): Promise<ZkSendLink> {
		const link = this.getLinkFromUrl(url);
		await link.loadAssets();
		return link;
	}
}

export function zksend<Name extends string = 'zksend'>({
	name = 'zksend' as Name,
	...options
}: ZkSendOptions<Name> = {}): SuiClientRegistration<ZkSendCompatibleClient, Name, ZkSendClient> {
	return {
		name,
		register: (client) => {
			return new ZkSendClient(client, options);
		},
	};
}
