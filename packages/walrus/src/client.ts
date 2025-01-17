// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { SuiClient } from '@mysten/sui/client';

import { TESTNET_WALRUS_PACKAGE_CONFIG } from './constants.js';
import { StakingInnerV1 } from './contracts/walrus/staking_inner.js';
import { Staking } from './contracts/walrus/staking.js';
import { SystemStateInnerV1 } from './contracts/walrus/system_state_inner.js';
import { System } from './contracts/walrus/system.js';
import { SuiObjectDataLoader } from './utils/object-loader.js';

export interface WalrusPackageConfig {
	packageId: string;
	systemObjectId: string;
	stakingPoolId: string;
	exchangeIds?: string[];
}

type SuiClientOrRpcUrl =
	| {
			suiClient: SuiClient;
			suiRpcUrl?: never;
	  }
	| {
			suiRpcUrl: string;
			suiClient?: never;
	  };

type WalrusNetworkOrPackageConfig =
	| {
			network: 'testnet';
			packageConfig?: WalrusPackageConfig;
	  }
	| {
			network?: never;
			packageConfig: WalrusPackageConfig;
	  };

export type WalrusClientConfig = WalrusNetworkOrPackageConfig & SuiClientOrRpcUrl;

export class WalrusClient {
	#packageConfig: WalrusPackageConfig;
	#suiClient: SuiClient;
	#objectLoader: SuiObjectDataLoader;

	constructor(config: WalrusClientConfig) {
		if (config.network && !config.packageConfig) {
			const network = config.network;
			switch (network) {
				case 'testnet':
					this.#packageConfig = TESTNET_WALRUS_PACKAGE_CONFIG;
					break;
				default:
					throw new Error(`Unsupported network: ${network}`);
			}
		} else {
			this.#packageConfig = config.packageConfig!;
		}

		this.#suiClient =
			config.suiClient ??
			new SuiClient({
				url: config.suiRpcUrl,
			});
		this.#objectLoader = new SuiObjectDataLoader(this.#suiClient);
	}

	#systemObject() {
		return this.#objectLoader.load(this.#packageConfig.systemObjectId, System());
	}

	#stakingObject() {
		return this.#objectLoader.load(this.#packageConfig.stakingPoolId, Staking());
	}

	async systemState() {
		const systemState = await this.#objectLoader.loadFieldObject(
			this.#packageConfig.systemObjectId,
			{ type: 'u64', value: (await this.#stakingObject()).version },
			SystemStateInnerV1(),
		);

		return systemState;
	}

	async stakingState() {
		return this.#objectLoader.loadFieldObject(
			this.#packageConfig.stakingPoolId,
			{
				type: 'u64',
				value: (await this.#systemObject()).version,
			},
			StakingInnerV1(),
		);
	}
}
