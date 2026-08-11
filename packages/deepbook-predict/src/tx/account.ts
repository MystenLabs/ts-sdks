import type { Transaction, TransactionObjectArgument } from '@mysten/sui/transactions';
import type { GeneratedConfig } from '../config/generated.js';
import * as account from '../contracts/account/account.js';
import * as accountRegistry from '../contracts/account/account_registry.js';
import { depositFunds } from './authed.js';

// Create the sender's canonical derived account wrapper and share it. `new` derives the
// wrapper at a deterministic address (see `deriveAccountWrapperId`); `share` publishes
// the shared object the trade flows borrow against. See
// `packages/account/sources/account_registry.move:74` and `account.move` (`share`).
export function createAccount(config: GeneratedConfig): (tx: Transaction) => void {
	return (tx) => {
		tx.add(account.share({ config, arguments: { self: accountRegistry._new({ config }) } }));
	};
}

// First-time funding in ONE PTB: create the sender's canonical wrapper, deposit the
// caller-provided `coin` into it through the fresh handle, and `share` it LAST (once
// shared, by-value use of the handle is over). This cannot be split across
// `createAccount` + a plain `deposit_funds`: an object input can only address an object that
// pre-exists the PTB, so a wrapper created inside it is reachable only through `new`'s
// result handle. `new` derives the wrapper at its deterministic address and aborts if
// it already exists.
export function createAccountAndDeposit(
	config: GeneratedConfig,
	args: { coin: TransactionObjectArgument; coinType: string },
): (tx: Transaction) => void {
	return (tx) => {
		const wrapper = tx.add(accountRegistry._new({ config }));
		tx.add(
			depositFunds({
				config,
				arguments: { wrapper, coin: args.coin },
				typeArguments: [args.coinType],
			}),
		);
		tx.add(account.share({ config, arguments: { self: wrapper } }));
	};
}
