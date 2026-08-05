import type {
	Transaction,
	TransactionObjectArgument,
	TransactionResult,
} from '@mysten/sui/transactions';
import { ACCUMULATOR_ROOT_ID, type PredictConfig } from '../config/index.js';
import * as account from '../contracts/account/account.js';
import * as accountRegistry from '../contracts/account/account_registry.js';
import { generateAuth } from './common.js';

// Create the sender's canonical derived account wrapper and share it. `new` derives the
// wrapper at a deterministic address (see `deriveAccountWrapperId`); `share` publishes
// the shared object the trade flows borrow against. See
// `packages/account/sources/account_registry.move:74` and `account.move` (`share`).
export function createAccount(cfg: PredictConfig): (tx: Transaction) => void {
	return (tx) => {
		const wrapper = tx.add(
			accountRegistry._new({
				package: cfg.packages.account,
				arguments: { registry: cfg.objects.accountRegistry },
			}),
		);
		tx.add(
			account.share({
				package: cfg.packages.account,
				arguments: { self: wrapper },
			}),
		);
	};
}

// Deposit a caller-provided `coin` into the account's stored balance via the
// PTB-callable `deposit_funds` (folds settle → authorize → load → deposit; clock
// auto-injected). The caller owns coin sourcing. See
// `packages/account/sources/account.move` (`deposit_funds`).
export function depositFunds(
	cfg: PredictConfig,
	args: { wrapperId: string; coin: TransactionObjectArgument; coinType?: string },
): (tx: Transaction) => void {
	return (tx) => {
		const auth = tx.add(generateAuth(cfg));
		tx.add(
			account.depositFunds({
				package: cfg.packages.account,
				arguments: {
					wrapper: args.wrapperId,
					auth,
					coin: args.coin,
					root: ACCUMULATOR_ROOT_ID,
				},
				typeArguments: [args.coinType ?? cfg.quoteCoinType],
			}),
		);
	};
}

// Withdraw `amountRaw` (raw u64 units) from the account's stored balance via the
// PTB-callable `withdraw_funds` (folds settle → authorize → load → withdraw; clock
// auto-injected), returning the minted `Coin<T>`. `ctx` is implicit in a PTB. See
// `packages/account/sources/account.move` (`withdraw_funds`).
export function withdrawFunds(
	cfg: PredictConfig,
	args: { wrapperId: string; amountRaw: bigint; coinType?: string },
): (tx: Transaction) => TransactionResult {
	return (tx) => {
		const auth = tx.add(generateAuth(cfg));
		return tx.add(
			account.withdrawFunds({
				package: cfg.packages.account,
				arguments: {
					wrapper: args.wrapperId,
					auth,
					amount: args.amountRaw,
					root: ACCUMULATOR_ROOT_ID,
				},
				typeArguments: [args.coinType ?? cfg.quoteCoinType],
			}),
		);
	};
}
