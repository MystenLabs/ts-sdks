// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// PredictConfig — resolves the package IDs, shared-object IDs, and coin types the
// transaction/query layers need. Predict is not yet published, so there is no
// per-network default block: callers must supply `packageIds` explicitly (the same
// override path deepbook-v3 uses pre-publish). Once Predict deploys, add a
// `TESTNET_PREDICT_IDS` constant here and merge it by `network`.

export type PredictNetwork = 'mainnet' | 'testnet' | 'localnet';

/** On-chain identifiers the SDK resolves calls against. */
export interface PredictIds {
	/** Published `deepbook_predict` package ID (`0x…::module::fn` target prefix). */
	predictPackageId: string;
	/** Published `account` package ID (custody primitive). */
	accountPackageId: string;
	/** Published `propbook` package ID (oracle feeds). */
	propbookPackageId: string;
	/** Shared `deepbook_predict::registry::Registry`. */
	registryId: string;
	/** Shared `deepbook_predict::plp::PoolVault`. */
	poolVaultId: string;
	/** Shared `deepbook_predict::protocol_config::ProtocolConfig`. */
	protocolConfigId: string;
	/** Shared `propbook::registry::OracleRegistry`. */
	oracleRegistryId: string;
	/** Shared `account::account_registry::AccountRegistry`. */
	accountRegistryId: string;
	/** Fully-qualified DUSDC coin type (the settlement asset). */
	dusdcType: string;
}

export interface PredictConfigOptions {
	network?: PredictNetwork;
	/** Default sender address for built transactions. */
	address?: string;
	/**
	 * Base URL of a `predict-server` indexer instance for history/list queries.
	 * No hosted default exists yet; on-chain (`devInspect`) queries work without it.
	 */
	indexerUrl?: string;
	/** Explicit on-chain IDs. Required until Predict is published. */
	ids: PredictIds;
}

export class PredictConfig {
	readonly network: PredictNetwork;
	readonly address?: string;
	readonly indexerUrl?: string;
	readonly #ids: PredictIds;

	constructor(options: PredictConfigOptions) {
		this.network = options.network ?? 'testnet';
		this.address = options.address;
		this.indexerUrl = options.indexerUrl;
		this.#ids = options.ids;
	}

	get ids(): PredictIds {
		return this.#ids;
	}

	/** Assert an indexer URL is configured, returning it (for indexer-backed queries). */
	requireIndexerUrl(): string {
		if (!this.indexerUrl) {
			throw new Error('PredictConfig.indexerUrl is not set; this query requires an indexer');
		}
		return this.indexerUrl;
	}
}
