// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { Transaction } from '@mysten/sui/transactions';

import * as plp from '../contracts/deepbook_predict/plp.js';
import type { QueryContext } from './context.js';
import { parseAddressVector, parseU64, type SimulateResult } from './decode.js';

/** Decoded scalar state of the shared pool vault (raw on-chain units). */
export interface VaultState {
	idleBalance: bigint;
	plpTotalSupply: bigint;
	stakedDeep: bigint;
	protocolReserveBalance: bigint;
	feeIncentiveReserve: bigint;
	supplyRequestsPending: bigint;
	withdrawRequestsPending: bigint;
	pendingProtocolProfit: bigint;
}

/** On-chain reads of pool-vault state via `client.core.simulateTransaction`. */
export class VaultQueries {
	#ctx: QueryContext;

	constructor(ctx: QueryContext) {
		this.#ctx = ctx;
	}

	get #vault() {
		return this.#ctx.config.ids.poolVaultId;
	}

	get #predictPackageId() {
		return this.#ctx.config.ids.predictPackageId;
	}

	async #simulate(tx: Transaction): Promise<SimulateResult> {
		return this.#ctx.client.core.simulateTransaction({
			transaction: tx,
			include: { commandResults: true, effects: true },
		});
	}

	/** Read the vault's balance/accounting scalars in one inspect. */
	async getVaultState(): Promise<VaultState> {
		const pkg = this.#predictPackageId;
		const vault = this.#vault;
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(plp.idleBalance({ package: pkg, arguments: { vault } }));
		tx.add(plp.plpTotalSupply({ package: pkg, arguments: { vault } }));
		tx.add(plp.stakedDeep({ package: pkg, arguments: { vault } }));
		tx.add(plp.protocolReserveBalance({ package: pkg, arguments: { vault } }));
		tx.add(plp.feeIncentiveReserve({ package: pkg, arguments: { vault } }));
		tx.add(plp.supplyRequestsPending({ package: pkg, arguments: { vault } }));
		tx.add(plp.withdrawRequestsPending({ package: pkg, arguments: { vault } }));
		tx.add(plp.pendingProtocolProfit({ package: pkg, arguments: { vault } }));

		const res = await this.#simulate(tx);
		return {
			idleBalance: parseU64(res, 0),
			plpTotalSupply: parseU64(res, 1),
			stakedDeep: parseU64(res, 2),
			protocolReserveBalance: parseU64(res, 3),
			feeIncentiveReserve: parseU64(res, 4),
			supplyRequestsPending: parseU64(res, 5),
			withdrawRequestsPending: parseU64(res, 6),
			pendingProtocolProfit: parseU64(res, 7),
		};
	}

	/** The set of active expiry markets (their object ids) that a flush must value. */
	async activeExpiryMarkets(): Promise<string[]> {
		const tx = new Transaction();
		tx.setSender(this.#ctx.address);
		tx.add(
			plp.activeExpiryMarkets({
				package: this.#predictPackageId,
				arguments: { vault: this.#vault },
			}),
		);
		const res = await this.#simulate(tx);
		return parseAddressVector(res, 0);
	}
}
