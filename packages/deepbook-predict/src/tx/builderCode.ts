import type { Transaction } from '@mysten/sui/transactions';
import type { PredictConfig } from '../config/index.js';
import * as predictAccount from '../contracts/deepbook_predict/predict_account.js';
import { generateAuth } from './common.js';

// Set the account's sticky builder-code attribution to `builderCodeId`, an existing
// `BuilderCode` object borrowed as `&BuilderCode`. Command order is auth → set (auth is a
// hot potato consumed by this call). Lives in the PREDICT package's `predict_account`
// module, NOT the account package. Deployed sig
// `packages/predict/sources/predict_account.move:134` — 3 moveCall args
// (wrapper, auth, code; ctx implicit).
export function setBuilderCode(
	cfg: PredictConfig,
	args: { wrapperId: string; builderCodeId: string },
): (tx: Transaction) => void {
	return (tx) => {
		const auth = tx.add(generateAuth(cfg));
		tx.add(
			predictAccount.setBuilderCode({
				package: cfg.packages.predict,
				arguments: {
					wrapper: args.wrapperId,
					auth,
					code: args.builderCodeId,
				},
			}),
		);
	};
}

// Clear the account's sticky builder-code attribution. Command order is auth → unset.
// Deployed sig `.../predict_account.move:151` — 2 moveCall args (wrapper, auth; ctx implicit).
export function unsetBuilderCode(
	cfg: PredictConfig,
	args: { wrapperId: string },
): (tx: Transaction) => void {
	return (tx) => {
		const auth = tx.add(generateAuth(cfg));
		tx.add(
			predictAccount.unsetBuilderCode({
				package: cfg.packages.predict,
				arguments: {
					wrapper: args.wrapperId,
					auth,
				},
			}),
		);
	};
}
