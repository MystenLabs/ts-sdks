// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { Transaction } from '@mysten/sui/transactions';

import * as account from '../contracts/account/account.js';
import * as predictAccount from '../contracts/deepbook_predict/predict_account.js';
import type { PredictConfig } from '../utils/config.js';

/**
 * Predict-side account settings stored in the account's `PredictData` slot.
 *
 * The `PredictData` slot is auto-attached on first mint (or first `set_builder_code`),
 * so a trader needs no explicit setup beyond creating + funding the account. Both
 * calls consume a fresh owner `Auth`.
 */
export class PredictAccountContract {
	#config: PredictConfig;

	constructor(config: PredictConfig) {
		this.#config = config;
	}

	#auth(tx: Transaction) {
		if (this.#config.address) {
			tx.setSenderIfNotSet(this.#config.address);
		}
		return tx.add(account.generateAuth({ package: this.#config.ids.accountPackageId }));
	}

	/** Opt into a builder code (`code` is a shared `BuilderCode` object id). */
	setBuilderCode = (params: { account: string; builderCode: string }) => (tx: Transaction) => {
		const auth = this.#auth(tx);
		tx.add(
			predictAccount.setBuilderCode({
				package: this.#config.ids.predictPackageId,
				arguments: { wrapper: params.account, auth, code: params.builderCode },
			}),
		);
	};

	/** Clear the account's builder code. */
	unsetBuilderCode = (params: { account: string }) => (tx: Transaction) => {
		const auth = this.#auth(tx);
		tx.add(
			predictAccount.unsetBuilderCode({
				package: this.#config.ids.predictPackageId,
				arguments: { wrapper: params.account, auth },
			}),
		);
	};
}
