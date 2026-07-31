import type { Transaction } from '@mysten/sui/transactions';
import { ACCUMULATOR_ROOT_ID, type PredictConfig } from '../config/index.js';
import * as plp from '../contracts/deepbook_predict/plp.js';
import { generateAuth } from './common.js';

// Queue a supply request pulling `amountRaw` (raw DUSDC u64) from the account's existing
// custody balance. `request_supply` auto-settles DUSDC then `account.withdraw`s the payment
// into queue escrow; the PLP fill is delivered at the next flush, not returned here. Command
// order is auth → request (auth is a hot potato consumed by this call). `minPlpOutRaw` is the
// per-request floor on PLP minted at flush (0 = no floor; after three misses the request is
// cancelled and refunded).
export function requestSupply(
	cfg: PredictConfig,
	tx: Transaction,
	args: { wrapperId: string; amountRaw: bigint; minPlpOutRaw?: bigint },
): void {
	const auth = generateAuth(cfg, tx);
	tx.add(
		plp.requestSupply({
			package: cfg.packages.predict,
			arguments: {
				vault: cfg.objects.poolVault,
				wrapper: args.wrapperId,
				auth,
				config: cfg.objects.protocolConfig,
				amount: args.amountRaw,
				minPlpOut: args.minPlpOutRaw ?? 0n,
				root: ACCUMULATOR_ROOT_ID,
			},
		}),
	);
}

// Queue a withdraw request pulling `sharesRaw` (raw PLP u64) from account custody into queue
// escrow. Auto-settles flush-delivered PLP first; the DUSDC fill lands on the account at the
// next flush (no `withdraw_settled` entrypoint). Command order is auth → request.
// `minDusdcOutRaw` is the per-request floor on DUSDC paid at flush (0 = no floor; after three
// misses the request is cancelled and refunded).
export function requestWithdraw(
	cfg: PredictConfig,
	tx: Transaction,
	args: { wrapperId: string; sharesRaw: bigint; minDusdcOutRaw?: bigint },
): void {
	const auth = generateAuth(cfg, tx);
	tx.add(
		plp.requestWithdraw({
			package: cfg.packages.predict,
			arguments: {
				vault: cfg.objects.poolVault,
				wrapper: args.wrapperId,
				auth,
				config: cfg.objects.protocolConfig,
				amount: args.sharesRaw,
				minDusdcOut: args.minDusdcOutRaw ?? 0n,
				root: ACCUMULATOR_ROOT_ID,
			},
		}),
	);
}

// Cancel a still-pending supply request by queue `index`, refunding its escrowed DUSDC
// straight back into the requesting account. Command order is auth → cancel.
export function cancelSupplyRequest(
	cfg: PredictConfig,
	tx: Transaction,
	args: { wrapperId: string; index: bigint },
): void {
	const auth = generateAuth(cfg, tx);
	tx.add(
		plp.cancelSupplyRequest({
			package: cfg.packages.predict,
			arguments: {
				vault: cfg.objects.poolVault,
				wrapper: args.wrapperId,
				auth,
				config: cfg.objects.protocolConfig,
				index: args.index,
				root: ACCUMULATOR_ROOT_ID,
			},
		}),
	);
}

// Cancel a still-pending withdraw request by queue `index`, refunding its escrowed PLP
// straight back into the requesting account. Command order is auth → cancel.
export function cancelWithdrawRequest(
	cfg: PredictConfig,
	tx: Transaction,
	args: { wrapperId: string; index: bigint },
): void {
	const auth = generateAuth(cfg, tx);
	tx.add(
		plp.cancelWithdrawRequest({
			package: cfg.packages.predict,
			arguments: {
				vault: cfg.objects.poolVault,
				wrapper: args.wrapperId,
				auth,
				config: cfg.objects.protocolConfig,
				index: args.index,
				root: ACCUMULATOR_ROOT_ID,
			},
		}),
	);
}
