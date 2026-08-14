import { Transaction } from '@mysten/sui/transactions';
import { type PredictConfig } from '../config/index.js';
import { accountContract, deriveAccountWrapperId } from '../tx/common.js';
import * as predictAccount from '../contracts/deepbook_predict/predict_account.js';
import { inspectReturns, type ReadClient } from './inspect.js';
import { parseU64LE } from './parse.js';

// An owner's stored account balance for a coin type (defaults to the quote coin,
// DUSDC on testnet). The shared account primitive chains
// `account::load_account(wrapper)` → `account::balance<T>(account, root, clock)`; the
// u64 is the LAST command's return. The clock is auto-injected by the generated
// `balance` wrapper; the wrapper id is derived off-chain (no read).
export async function accountBalance(
	client: ReadClient,
	cfg: PredictConfig,
	owner: string,
	coinType: string = cfg.quoteCoinType,
): Promise<bigint> {
	const tx = new Transaction();
	tx.add(accountContract(cfg).balance({ owner, coinType }));
	const cmds = await inspectReturns(client, tx);
	return parseU64LE(cmds[cmds.length - 1][0]);
}

// Whether the owner's account still holds `orderId` on `marketId`. The cheap
// on-chain validator for app-stored order ids (stale after a full close or a
// partial-close replacement — see RedeemReceipt.replacementOrderId). Chains
// `account::load_account(wrapper)` → `predict_account::has_position(account,
// market_id, order_id)` — see packages/predict/sources/predict_account.move:85.
export async function hasPosition(
	client: ReadClient,
	cfg: PredictConfig,
	owner: string,
	marketId: string,
	orderId: bigint,
): Promise<boolean> {
	const wrapperId = deriveAccountWrapperId(cfg, owner);
	const tx = new Transaction();
	const acct = tx.add(accountContract(cfg).loadAccount({ wrapperId }));
	tx.add(
		predictAccount.hasPosition({
			package: cfg.packages.predict,
			arguments: { account: acct, expiryMarketId: marketId, orderId },
		}),
	);
	const cmds = await inspectReturns(client, tx);
	return (cmds[cmds.length - 1][0][0] ?? 0) !== 0; // BCS bool: 1 byte
}
