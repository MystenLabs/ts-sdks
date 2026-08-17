import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';
import { toGeneratedConfig, type GeneratedConfig } from '../config/generated.js';
import type { PredictConfig } from '../config/index.js';
import { AccountContract, accountMoveCalls as account } from '@mysten/deepbook-account';

// Predict's accounts ARE the shared on-chain account primitive (`packages/account`), so the
// builders live in `@mysten/deepbook-account` and this is the thin adapter that drives them with
// Predict's deployed ids. The generated thunks are still used directly by `withAuth` below, which
// wraps Predict's own entrypoints too — those take the same `Auth` hot potato.
export function accountContract(cfg: PredictConfig): AccountContract {
	return new AccountContract({
		accountPackageId: cfg.packages.account,
		accountRegistry: cfg.objects.accountRegistry,
	});
}

/**
 * Owner authority is a hot-potato `Auth` minted from the tx sender (`ctx` is implicit in a PTB)
 * and consumed by the very next account-loading call (`load_account_mut` inside `deposit_funds` /
 * `withdraw_funds` / `mint` / …). It resolves to owner auth for whoever signs the transaction.
 * See `packages/account/sources/account.move`.
 */
export function generateAuth(cfg: PredictConfig): (tx: Transaction) => TransactionResult {
	return account.generateAuth({ config: toGeneratedConfig(cfg) });
}

// The shape every generated binding shares: options in, one PTB command out.
type GeneratedCall<Options> = (options: Options) => (tx: Transaction) => TransactionResult;

// The generated options of a call that consumes the hot-potato `Auth`. Codegen types
// `arguments` as the named form OR a positional tuple; only the named form is used here.
interface AuthCallOptions {
	arguments: { auth: TransactionArgument } | readonly unknown[];
	config?: object;
	package?: string;
}

// The named-`arguments` arm of such an options type (the tuple arm has no `auth` property).
type NamedArguments<Options extends AuthCallOptions> = Extract<
	Options['arguments'],
	{ auth: TransactionArgument }
>;

/**
 * The options {@link withAuth} leaves to the caller: the generated ones, minus the `auth`
 * argument it supplies itself, with the projected config required (it is what mints the auth).
 */
export type WithAuthOptions<Options extends AuthCallOptions> = Omit<
	Options,
	'arguments' | 'config'
> & {
	config: GeneratedConfig;
	arguments: Omit<NamedArguments<Options>, 'auth'>;
};

/**
 * Every owner-authorized call in this SDK is the same two commands — mint the hot-potato `Auth`,
 * then make the generated call that consumes it. This lifts a generated binding into that pair,
 * so such a builder is declared rather than written: `withAuth(account.depositFunds)` takes
 * `deposit_funds`'s own options with the `auth` slot already filled.
 */
export function withAuth<Options extends AuthCallOptions>(
	call: GeneratedCall<Options>,
): (options: WithAuthOptions<Options>) => (tx: Transaction) => TransactionResult {
	return (options) => (tx) => {
		const auth = tx.add(account.generateAuth({ config: options.config }));
		// The one unchecked step: with `Options` still generic, TS cannot see that putting `auth`
		// back makes the arguments whole again. Callers get the fully checked type above.
		return tx.add(
			call({ ...options, arguments: { ...options.arguments, auth } } as unknown as Options),
		);
	};
}

// The derivation must agree with on-chain `derive_address`, so it is owned in one place:
// `@mysten/deepbook-account`. This projects Predict's config onto that contract.
export function deriveAccountWrapperIdFrom(
	config: Pick<GeneratedConfig, 'accountRegistry' | 'accountPackageId'>,
	owner: string,
): string {
	return new AccountContract({
		accountPackageId: config.accountPackageId,
		accountRegistry: config.accountRegistry,
	}).deriveAccountWrapperId(owner);
}

/** The deterministic id of an owner's canonical account wrapper — no chain read needed. */
export function deriveAccountWrapperId(cfg: PredictConfig, owner: string): string {
	return deriveAccountWrapperIdFrom(toGeneratedConfig(cfg), owner);
}
