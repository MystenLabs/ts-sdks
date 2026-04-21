// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import { deriveObjectID, normalizeStructTag, normalizeSuiAddress } from '@mysten/sui/utils';

import type { AnalyzedCommandArgument, AnalyzedMoveCallCommand } from '../rules/commands.js';
import type {
	BalanceFlowsMoveCallHandler,
	BalanceFlowsMoveCallHandlerContext,
	BalanceFlowsMoveCallHandlerFactory,
} from '../rules/balance-flows.js';

function readPureU64(arg: AnalyzedCommandArgument | undefined): bigint | null {
	if (arg?.$kind !== 'Pure') return null;
	try {
		return BigInt(bcs.u64().fromBase64(arg.bytes));
	} catch {
		return null;
	}
}

function readPureAddress(arg: AnalyzedCommandArgument | undefined): string | null {
	if (arg?.$kind !== 'Pure') return null;
	try {
		return normalizeSuiAddress(bcs.Address.fromBase64(arg.bytes));
	} catch {
		return null;
	}
}

function coinTypeOf(command: AnalyzedMoveCallCommand): string | null {
	const arg = command.command.typeArguments?.[0];
	return arg ? normalizeStructTag(arg) : null;
}

function deriveAccountAddress(owner: string, packageId: string, namespaceId: string): string {
	const key = bcs.Address.serialize(owner).toBytes();
	return deriveObjectID(namespaceId, `${packageId}::keys::AccountKey`, key);
}

/**
 * Create a `balanceFlows` handler factory for the Permissioned Assets
 * Standard (PAS).
 *
 * @experimental PAS is still evolving and the on-chain signatures covered
 * by this handler may change. Expect both the set of supported Move calls
 * and the shape of the delta emission to shift alongside the standard.
 */
export function createPASMoveCallHandler(options: {
	packageId: string;
	namespaceId: string;
}): BalanceFlowsMoveCallHandlerFactory {
	const packageId = normalizeSuiAddress(options.packageId);
	const namespaceId = normalizeSuiAddress(options.namespaceId);

	return (): BalanceFlowsMoveCallHandler => {
		// Fresh accounts created in-PTB: ctx key -> account object address.
		const accountByResult = new Map<string, string>();
		// SendFunds<T> hot potatoes: ctx key -> pending credit at resolver time.
		const sendFundsByResult = new Map<
			string,
			{ coinType: string; amount: bigint; recipient: string | null }
		>();
		// UnlockFunds<T> / ClawbackFunds<T> hot potatoes: ctx key -> Balance<T> to
		// surface as a tracked balance at the resolver's result slot.
		const fundsByResult = new Map<string, { coinType: string; amount: bigint }>();

		return (command: AnalyzedMoveCallCommand, ctx: BalanceFlowsMoveCallHandlerContext): boolean => {
			if (normalizeSuiAddress(command.command.package) !== packageId) return false;

			const mod = command.command.module;
			const fn = command.command.function;
			const coinType = coinTypeOf(command);
			const context = `pas::${mod}::${fn} at command ${command.index}`;

			const flagNonPureAmount = (argIndex: number) =>
				ctx.addIssue({
					message: `${context} expects a pure u64 amount at argument ${argIndex}`,
				});

			const readAccountAddress = (arg: AnalyzedCommandArgument | undefined): string | null => {
				if (arg?.$kind === 'Object') return normalizeSuiAddress(arg.object.objectId);
				const key = arg ? ctx.keyFor(arg) : null;
				return key ? (accountByResult.get(key) ?? null) : null;
			};

			if (mod === 'account') {
				switch (fn) {
					case 'create': {
						const owner = readPureAddress(command.arguments[1]);
						if (owner) {
							accountByResult.set(
								ctx.outputKey(0),
								deriveAccountAddress(owner, packageId, namespaceId),
							);
						}
						return true;
					}
					case 'deposit_balance': {
						const accountAddress = readAccountAddress(command.arguments[0]);
						const balance = ctx.getTrackedBalance(command.arguments[1]);
						if (balance) {
							// Always consume — the deposit debits the source regardless of
							// whether we can attribute it to a specific account. Leaving the
							// balance alive would silently credit the original owner back
							// via the implicit-return loop.
							if (accountAddress) {
								ctx.recordFlow(accountAddress, balance.coinType, balance.balance);
							}
							balance.consume();
						}
						return true;
					}
					case 'unlock_balance':
					case 'clawback_balance': {
						const accountAddress = readAccountAddress(command.arguments[0]);
						const amountArgIndex = fn === 'unlock_balance' ? 2 : 1;
						const amount = readPureU64(command.arguments[amountArgIndex]);
						if (amount == null) {
							flagNonPureAmount(amountArgIndex);
							return true;
						}
						if (!coinType) return true;
						if (!accountAddress) {
							ctx.addIssue({
								message: `${context} could not resolve the source account; debit un-attributed`,
							});
							return true;
						}
						ctx.recordFlow(accountAddress, coinType, -amount);
						fundsByResult.set(ctx.outputKey(0), { coinType, amount });
						return true;
					}
					case 'send_balance':
					case 'unsafe_send_balance': {
						const fromAddress = readAccountAddress(command.arguments[0]);
						let toAddress: string | null;
						if (fn === 'send_balance') {
							toAddress = readAccountAddress(command.arguments[2]);
						} else {
							const recipient = readPureAddress(command.arguments[2]);
							toAddress = recipient
								? deriveAccountAddress(recipient, packageId, namespaceId)
								: null;
						}
						const amount = readPureU64(command.arguments[3]);
						if (amount == null) {
							flagNonPureAmount(3);
							return true;
						}
						if (!coinType) return true;
						if (!fromAddress) {
							// Source unknown: don't fabricate a credit from nothing. Flag
							// so the caller doesn't silently interpret "no delta" as
							// "no value moved".
							ctx.addIssue({
								message: `${context} could not resolve the source account; debit un-attributed`,
							});
							return true;
						}
						// Unresolved `toAddress` is acceptable — we know what left, we
						// just can't attribute the credit. The resolver will skip the
						// credit side when `recipient` is null.
						ctx.recordFlow(fromAddress, coinType, -amount);
						sendFundsByResult.set(ctx.outputKey(0), {
							coinType,
							amount,
							recipient: toAddress,
						});
						return true;
					}
				}
			}

			if (
				(mod === 'unlock_funds' && (fn === 'resolve' || fn === 'resolve_unrestricted_balance')) ||
				(mod === 'clawback_funds' && fn === 'resolve')
			) {
				const key = ctx.keyFor(command.arguments[0]);
				if (!key) return true;
				const pending = fundsByResult.get(key);
				if (pending) {
					ctx.trackBalanceResult(0, pending.coinType, pending.amount);
					fundsByResult.delete(key);
				}
				return true;
			}

			if (mod === 'send_funds' && fn === 'resolve_balance') {
				const key = ctx.keyFor(command.arguments[0]);
				if (!key) return true;
				const pending = sendFundsByResult.get(key);
				if (pending && pending.recipient) {
					ctx.recordFlow(pending.recipient, pending.coinType, pending.amount);
				}
				sendFundsByResult.delete(key);
				return true;
			}

			return false;
		};
	};
}
