import type { Transaction, TransactionResult } from '@mysten/sui/transactions';
import { AccountContract } from '@mysten/deepbook-account';
import type { PredictConfig } from '../config/index.js';

// Predict's accounts ARE the shared on-chain account primitive (`packages/account`), so
// the builders live in `@mysten/deepbook-account` and this module is the thin adapter that
// drives them with Predict's deployed ids. Predict's own entrypoints (mint, redeem, PLP,
// builder codes) take the same `Auth` hot potato, which is why `generateAuth` is re-exposed
// here in `(cfg) => (tx)` thunk form rather than callers reaching for the contract directly.
export function accountContract(cfg: PredictConfig): AccountContract {
	return new AccountContract({
		accountPackageId: cfg.packages.account,
		accountRegistry: cfg.objects.accountRegistry,
	});
}

// Owner authority is a hot-potato `Auth` minted from the tx sender (`ctx` is implicit
// in a PTB) and consumed by the very next account-loading call (`load_account_mut`
// inside `deposit_funds` / `withdraw_funds` / `mint` / …).
export function generateAuth(cfg: PredictConfig): (tx: Transaction) => TransactionResult {
	return accountContract(cfg).generateAuth();
}

// The deterministic id of an owner's canonical account wrapper — no chain read needed.
export function deriveAccountWrapperId(cfg: PredictConfig, owner: string): string {
	return accountContract(cfg).deriveAccountWrapperId(owner);
}
