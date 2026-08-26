import { Transaction } from '@mysten/sui/transactions';
import type { GeneratedConfig } from '../config/generated.js';
import { deriveAccountWrapperIdFrom } from '../tx/common.js';
import { accountMoveCalls as account } from '../../account.js';
import * as predictAccount from '../../contracts/deepbook_predict/predict_account.js';
import { inspectReturns, type ReadClient } from './inspect.js';
import { parseU64LE } from './parse.js';

// An owner's stored account balance for `coinType` (the deployment's quote coin,
// DUSDC on testnet, unless the caller asks for another). Chains `account::load_account(wrapper)` →
// `account::balance<T>(account, root, clock)`; the u64 is command 1's return —
// see packages/account/sources/account.move:{80,86}. The clock is auto-injected by
// the generated `balance` wrapper; the wrapper id is derived off-chain (no read).
export async function accountBalance(
	client: ReadClient,
	config: GeneratedConfig,
	owner: string,
	coinType: string,
): Promise<bigint> {
	const tx = new Transaction();
	const acct = tx.add(
		account.loadAccount({ config, arguments: { self: deriveAccountWrapperIdFrom(config, owner) } }),
	);
	tx.add(account.balance({ config, typeArguments: [coinType], arguments: { self: acct } }));
	const cmds = await inspectReturns(client, tx);
	return parseU64LE(cmds[1][0]);
}

// Whether the owner's account still holds `orderId` on `marketId`. The cheap
// on-chain validator for app-stored order ids (stale after a full close or a
// partial-close replacement — see RedeemReceipt.replacementOrderId). Chains
// `account::load_account(wrapper)` → `predict_account::has_position(account,
// market_id, order_id)` — see packages/predict/sources/predict_account.move:85.
export async function hasPosition(
	client: ReadClient,
	config: GeneratedConfig,
	owner: string,
	marketId: string,
	orderId: bigint,
): Promise<boolean> {
	const tx = new Transaction();
	const acct = tx.add(
		account.loadAccount({ config, arguments: { self: deriveAccountWrapperIdFrom(config, owner) } }),
	);
	tx.add(
		predictAccount.hasPosition({
			config,
			arguments: { account: acct, expiryMarketId: marketId, orderId },
		}),
	);
	const cmds = await inspectReturns(client, tx);
	return (cmds[1][0][0] ?? 0) !== 0; // BCS bool: 1 byte
}
