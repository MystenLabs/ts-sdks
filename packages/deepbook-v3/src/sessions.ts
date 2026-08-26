// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { bcs } from '@mysten/sui/bcs';
import type { Transaction, TransactionArgument, TransactionResult } from '@mysten/sui/transactions';
import { deriveDynamicFieldID, deriveObjectID } from '@mysten/sui/utils';

import { TESTNET_SESSIONS } from './deployments/testnet.js';
import type { NetworkArg } from './deployments/index.js';

// Provenance and scale constants, so a sessions-only consumer can answer "which deployment
// is this pinned to?" and format a custody balance without importing another subpath.
export { getDeployment, getUnits, TESTNET_DEPLOYMENT, TESTNET_UNITS } from './deployments/index.js';
export type { DeployedNetwork, NetworkArg } from './deployments/index.js';

import { AccountContract } from './account.js';
import type { DeepbookSessionsConfig } from './contracts/deepbook_sessions/config-arguments.js';
import * as sessions from './contracts/deepbook_sessions/sessions.js';
import { SessionsData } from './contracts/deepbook_sessions/sessions.js';

/**
 * Deployed ids the sessions builders address.
 *
 * `accountPackageId` / `accountRegistry` are the same shared-account ids
 * {@link AccountContract} takes — sessions is an Account app, so it addresses the same
 * registry. `sessionsPackageId` and `sessionsConfig` come from the sessions deployment.
 */
export interface SessionsConfig extends DeepbookSessionsConfig {
	/** The `deepbook_sessions` Move package id. */
	sessionsPackageId: string;
	/** The shared `SessionsConfig` object id. */
	sessionsConfig: string;
	/** The shared `account` Move package id. */
	accountPackageId: string;
	/** The shared `AccountRegistry` object id. */
	accountRegistry: string;
}

/**
 * Ids the DeepBook **spot** session wrappers need on top of {@link SessionsConfig}. The
 * Predict wrappers never take these, so they are kept off the main config rather than made
 * optional there.
 */
export interface SessionsSpotIds {
	/** DeepBook's shared `Registry` — `deepbook_registry` on the spot entrypoints. */
	deepbookRegistry: string;
	/** The `deepbook_core_account` Move package id. */
	deepbookCoreAccountPackageId: string;
}

/** Ids the Predict session wrappers need beyond {@link SessionsConfig}. */
export interface SessionsPredictIds {
	/** Every Predict wrapper takes `config: &ProtocolConfig`. */
	protocolConfig: string;
}

/**
 * @description The deployed sessions ids for `network`, so a caller does not transcribe
 * them. Generated from the deploy manifest — see `src/deployments/`. The returned object
 * also carries {@link SessionsSpotIds} for the generated spot wrappers.
 * @throws if the network has no recorded deployment, rather than returning placeholder ids.
 *
 * ```ts
 * const sessions = new SessionsContract(getSessionsConfig('testnet'));
 * ```
 */
export function getSessionsConfig(
	network: NetworkArg,
): SessionsConfig & SessionsSpotIds & SessionsPredictIds {
	// The frozen record itself, matching `/account` — returning a spread here would have
	// quietly exempted this subpath from the immutability the others guarantee.
	if (network === 'testnet') return TESTNET_SESSIONS;
	throw new Error(
		`@mysten/deepbook-v3/sessions: no sessions deployment recorded for network '${network}'. ` +
			'Sessions is testnet-only today; for your own deployment construct a `SessionsConfig` ' +
			'and pass it to SessionsContract directly.',
	);
}

/** The maximum session duration the contract accepts: 30 days, in milliseconds. */
export const MAX_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

/** The maximum number of distinct session addresses one Account may store. */
export const MAX_SESSIONS_PER_ACCOUNT = 20;

// `sui::dynamic_field::Field<DataKey<SessionsApp>, SessionsData>` — what a core `getObject`
// on the grant field actually returns. `DataKey` is source-empty, but Move inserts a
// hidden `dummy_field: bool` into empty structs, so the name occupies ONE zero byte
// between the id and the value. Decoding the value alone would read the field id's first
// byte as the VecMap length: garbage grants, or a silent empty list.
const SessionsDataField = bcs.struct('Field<DataKey,SessionsData>', {
	id: bcs.Address,
	name: bcs.bool(), // DataKey's hidden dummy_field
	value: SessionsData,
});

// `AccountKey(owner)` — the canonical ACCOUNT identity, a different derived object from
// the wrapper. Grant data hangs off this one.
const AccountKey = bcs.struct('AccountKey', { pos0: bcs.Address });

/** One stored session grant. */
export interface SessionGrant {
	/** The authorized ephemeral address. */
	session: string;
	/** Absolute expiry, ms since epoch. The grant is dead AT this timestamp (strict `<`). */
	expiresAtMs: bigint;
}

/**
 * SessionsContract — time-limited trading sessions over a canonical Account.
 *
 * An Account owner authorizes an ephemeral address to submit a bounded set of
 * transactions on the Account's behalf until a fixed expiry. The session key never
 * receives a reusable `Auth`: each wrapper mints app authorization internally and
 * consumes it in the same call.
 *
 * WHAT A SESSION KEY CAN DO. It cannot withdraw to an address, cannot grant or revoke
 * sessions, and cannot outlive its expiry — those all require owner auth. It CAN trade
 * the Account's full balance: the spot wrappers take a caller-chosen `Pool` and, through
 * `deepbook_core_account`, pull the account's entire Base, Quote and DEEP balance
 * (stored plus unsettled) into the embedded manager for the duration of the call, with
 * `price_limit` supplied by the caller. Nothing caps notional, restricts which pools are
 * reachable, or bounds loss to adverse pricing. Treat a session key as authority over
 * everything the Account holds, and fund an ephemeral-session Account accordingly.
 *
 * Operational precondition: an admin must have authorized `SessionsApp` on the account
 * registry. Until then — or after a `deauthorize_app` — the TRADING wrappers abort with
 * `EAppNotAuthorized`; `authorizeSession`, `revokeSession` and `sessionExpirationMs` use
 * owner auth or no auth and keep working. Note that `deauthorize_app` does not clear
 * `SessionsData`, so re-authorizing makes every still-unexpired grant live again at once
 * — it is a pause, not a kill switch. Revoking, and reading expirations, also keep
 * working if the sessions package is later version-gated.
 *
 * This class wraps the session lifecycle and the **Predict** entrypoints. The DeepBook
 * spot session wrappers are generated (see `sessionsMoveCalls`) but are not wrapped here
 * — note `placeLimitOrder` and `placeMarketOrder` put `accountRegistry` at index 2 and
 * `sessionsConfig` at 4, because `deepbookRegistry` sits between them; the other three
 * (`cancelLiveOrder`, `cancelLiveOrders`, `withdrawSettledAmounts`) take no
 * `deepbookRegistry` and so keep 1 and 3 like the Predict wrappers:
 * the surrounding spot-over-Account workflow — discovering the embedded balance manager,
 * reading resting orders and locked balances — is not modelled yet, so a wrapped builder
 * would be hard to use well. They are reachable from the generated bindings meanwhile.
 */
export class SessionsContract {
	#config: SessionsConfig;

	constructor(config: SessionsConfig) {
		this.#config = config;
	}

	// The generated thunks resolve the package address and auto-inject the shared
	// `SessionsConfig` from this object. `accountRegistry` stays an explicit argument —
	// it belongs to the account package, which is a separate codegen entry.
	get #generatedConfig() {
		return {
			sessionsPackageId: this.#config.sessionsPackageId,
			sessionsConfig: this.#config.sessionsConfig,
		};
	}

	/**
	 * @description The owner's canonical `AccountWrapper` id — derived off-chain, no read.
	 * Every builder here takes that id.
	 */
	deriveAccountWrapperId(owner: string): string {
		return new AccountContract({
			accountPackageId: this.#config.accountPackageId,
			accountRegistry: this.#config.accountRegistry,
		}).deriveAccountWrapperId(owner);
	}

	/**
	 * @description The owner's canonical ACCOUNT id — a different derived object from the
	 * wrapper. The session grants hang off this one, so this is what
	 * {@link deriveSessionsFieldId} and {@link decodeSessions} work from.
	 */
	deriveAccountId(owner: string): string {
		return deriveObjectID(
			this.#config.accountRegistry,
			`${this.#config.accountPackageId}::account_registry::AccountKey`,
			AccountKey.serialize({ pos0: owner }).toBytes(),
		);
	}

	/**
	 * @description The object id of the owner's `DataKey<SessionsApp>` dynamic field —
	 * fetch this object and pass its BCS contents to {@link decodeSessions}. There is no
	 * bulk on-chain read, so this is the route to enumerating grants.
	 */
	deriveSessionsFieldId(owner: string): string {
		// A PLAIN dynamic field, not a derived object: `account::attach` writes it with
		// `df::add` (`use fun df::add as UID.add`), whereas the account and wrapper ids are
		// claimed through `derived_object::claim`. `deriveObjectID` would wrap the tag in
		// `0x2::derived_object::DerivedObjectKey<..>` and yield an id that points at nothing.
		return deriveDynamicFieldID(
			this.deriveAccountId(owner),
			`${this.#config.accountPackageId}::account::DataKey<${this.#config.sessionsPackageId}::sessions::SessionsApp>`,
			// DataKey is source-empty; Move's hidden `dummy_field: bool` is the key's one byte.
			new Uint8Array([0]),
		);
	}

	/**
	 * @description Grant `session` authority over the Account until `now + durationMs`.
	 * Authority is derived from the transaction SENDER, so the owner must sign this.
	 * `durationMs` must be > 0 and <= {@link MAX_SESSION_DURATION_MS}; an Account holds at
	 * most {@link MAX_SESSIONS_PER_ACCOUNT} distinct addresses. Re-authorizing an address
	 * replaces its expiry in place and consumes no additional slot.
	 * @returns A function that takes a Transaction object
	 */
	authorizeSession(params: { wrapperId: string; session: string; durationMs: number | bigint }) {
		return (tx: Transaction): void => {
			tx.add(
				sessions.authorizeSession({
					config: this.#generatedConfig,
					arguments: {
						wrapper: params.wrapperId,
						session: params.session,
						durationMs: params.durationMs,
					},
				}),
			);
		};
	}

	/**
	 * @description Remove `session`'s grant. Owner-signed, like `authorizeSession`.
	 * Deliberately takes no `SessionsConfig`: revocation is not version-gated, so it keeps
	 * working after the package is retired. Revoking an address that holds no grant is a
	 * silent no-op — it neither aborts nor emits, so read before and after if you need to
	 * distinguish "revoked" from "was never granted".
	 * @returns A function that takes a Transaction object
	 */
	revokeSession(params: { wrapperId: string; session: string }) {
		return (tx: Transaction): void => {
			tx.add(
				sessions.revokeSession({
					config: this.#generatedConfig,
					arguments: { wrapper: params.wrapperId, session: params.session },
				}),
			);
		};
	}

	/**
	 * @description Read one session's absolute expiry as `Option<u64>`. Compose in a
	 * dev-inspect/simulate PTB and decode the returned BCS. Not version-gated.
	 * @returns A function that takes a Transaction object
	 */
	sessionExpirationMs(params: { wrapperId: string; session: string }) {
		return (tx: Transaction): TransactionResult =>
			tx.add(
				sessions.sessionExpirationMs({
					config: this.#generatedConfig,
					arguments: { wrapper: params.wrapperId, session: params.session },
				}),
			);
	}

	// === Predict wrappers ===
	//
	// Each mirrors the Predict entrypoint of the same name, with two differences: the
	// caller supplies NO `Auth` (the wrapper mints and consumes app authorization
	// internally), and `accountRegistry` + `sessionsConfig` are threaded in. `pricer` is a
	// PTB RESULT, not an object — it comes from a preceding `expiry_market::load_live_pricer`
	// command in the same transaction. Everything else matches Predict exactly, and Predict
	// still performs all parameter validation.

	/**
	 * @description Mint a position of an exact payout quantity, as `session`. Pass
	 * `u64::MAX` for `maxCost` / `maxProbability` to leave either slippage cap
	 * effectively unbounded — the chain asserts `value <= cap`, so the max value can never
	 * trip. Both are required; there is no default.
	 * @returns A function that takes a Transaction object and returns the new order id (u256)
	 */
	mintExactQuantity(params: {
		expiryMarketId: string;
		wrapperId: string;
		protocolConfig: string;
		pricer: TransactionArgument;
		lowerTick: number | bigint;
		higherTick: number | bigint;
		quantity: number | bigint;
		maxCost: number | bigint;
		maxProbability: number | bigint;
	}) {
		return (tx: Transaction): TransactionResult =>
			tx.add(
				sessions.mintExactQuantity({
					config: this.#generatedConfig,
					arguments: {
						market: params.expiryMarketId,
						accountRegistry: this.#config.accountRegistry,
						wrapper: params.wrapperId,
						config: params.protocolConfig,
						pricer: params.pricer,
						lowerTick: params.lowerTick,
						higherTick: params.higherTick,
						quantity: params.quantity,
						maxCost: params.maxCost,
						maxProbability: params.maxProbability,
					},
				}),
			);
	}

	/**
	 * @description Mint by spending up to a premium budget, flooring the quantity received.
	 * The chain requires `maxCost > 0`.
	 * @returns A function that takes a Transaction object and returns the new order id (u256)
	 */
	mintExactAmount(params: {
		expiryMarketId: string;
		wrapperId: string;
		protocolConfig: string;
		pricer: TransactionArgument;
		lowerTick: number | bigint;
		higherTick: number | bigint;
		maxPremium: number | bigint;
		minQuantity: number | bigint;
		maxCost: number | bigint;
	}) {
		return (tx: Transaction): TransactionResult =>
			tx.add(
				sessions.mintExactAmount({
					config: this.#generatedConfig,
					arguments: {
						market: params.expiryMarketId,
						accountRegistry: this.#config.accountRegistry,
						wrapper: params.wrapperId,
						config: params.protocolConfig,
						pricer: params.pricer,
						lowerTick: params.lowerTick,
						higherTick: params.higherTick,
						maxPremium: params.maxPremium,
						minQuantity: params.minQuantity,
						maxCost: params.maxCost,
					},
				}),
			);
	}

	/**
	 * @description Close part or all of a live position at the pricer's mark, as `session`.
	 * `minProbability` / `minProceeds` are close-side slippage floors; `0` disables either,
	 * and OMITTING them is `0` — unlike the mint caps, which are required. On a delegated
	 * key this is the direction that closes a position at any price, so pass real floors
	 * unless you mean to accept whatever the mark gives you.
	 * @returns A function that takes a Transaction object and returns `Option<u256>` — the
	 * replacement order id when a partial close leaves quantity open
	 */
	redeemLive(params: {
		expiryMarketId: string;
		wrapperId: string;
		protocolConfig: string;
		pricer: TransactionArgument;
		orderId: bigint;
		closeQuantity: number | bigint;
		minProbability?: number | bigint;
		minProceeds?: number | bigint;
	}) {
		return (tx: Transaction): TransactionResult =>
			tx.add(
				sessions.redeemLive({
					config: this.#generatedConfig,
					arguments: {
						market: params.expiryMarketId,
						accountRegistry: this.#config.accountRegistry,
						wrapper: params.wrapperId,
						config: params.protocolConfig,
						pricer: params.pricer,
						orderId: params.orderId,
						closeQuantity: params.closeQuantity,
						minProbability: params.minProbability ?? 0,
						minProceeds: params.minProceeds ?? 0,
					},
				}),
			);
	}

	/**
	 * @description Claim a settled position in full, as `session`. Takes no pricer — the
	 * settlement price is fixed — and no quantity: a settled claim is all-or-nothing.
	 * @returns A function that takes a Transaction object
	 */
	redeemSettled(params: {
		expiryMarketId: string;
		wrapperId: string;
		protocolConfig: string;
		orderId: bigint;
	}) {
		return (tx: Transaction): void => {
			tx.add(
				sessions.redeemSettled({
					config: this.#generatedConfig,
					arguments: {
						market: params.expiryMarketId,
						accountRegistry: this.#config.accountRegistry,
						wrapper: params.wrapperId,
						config: params.protocolConfig,
						orderId: params.orderId,
					},
				}),
			);
		};
	}

	/**
	 * @description Decode an Account's stored grants from the raw BCS content of its
	 * `DataKey<SessionsApp>` dynamic FIELD object — the whole
	 * `Field<DataKey<SessionsApp>, SessionsData>`, as the core API returns it, not the
	 * inner `SessionsData`. Get the id from {@link deriveSessionsFieldId}.
	 *
	 * There is no bulk on-chain read — `sessionExpirationMs` answers one address at a time —
	 * so listing grants means fetching that field and decoding it here. Note the field hangs
	 * off the DERIVED ACCOUNT address, not the wrapper address; they are different objects.
	 *
	 * Expired grants are never pruned automatically and keep occupying slots, so callers
	 * managing the {@link MAX_SESSIONS_PER_ACCOUNT} cap should list, drop anything already
	 * expired, and revoke before granting again.
	 */
	static decodeSessions(contents: Uint8Array): SessionGrant[] {
		// Assert full consumption. `@mysten/bcs`'s ULEB reader indexes the underlying
		// ArrayBuffer rather than the view, so a truncated SUBARRAY — which is exactly what a
		// gRPC `content` field is — can read past its bound and decode to `[]` with no error.
		// Re-serializing and comparing lengths turns both truncation and trailing junk into a
		// throw, so "no grants" can only ever mean no grants.
		const field = SessionsDataField.parse(contents);
		const reencoded = SessionsDataField.serialize(field).toBytes();
		if (reencoded.length !== contents.length) {
			throw new Error(
				`sessions field is ${contents.length} bytes but its contents encode to ${reencoded.length}; ` +
					'the bytes are truncated or carry trailing data',
			);
		}
		return field.value.sessions.contents.map((entry) => ({
			session: entry.key,
			expiresAtMs: BigInt(entry.value),
		}));
	}

	/** Grants from {@link decodeSessions} that are still live at `nowMs`. */
	static activeSessions(grants: readonly SessionGrant[], nowMs: number | bigint): SessionGrant[] {
		const now = BigInt(nowMs);
		// The chain asserts `now < expiresAtMs`, so a grant is dead AT its expiry.
		return grants.filter((g) => now < g.expiresAtMs);
	}

	/**
	 * @description Grants that are already dead at `nowMs` — the complement of
	 * {@link activeSessions}, and the list to revoke when reclaiming slots. Use this rather
	 * than filtering by hand: `nowMs > expiresAtMs` looks equivalent but leaves the grant
	 * expiring exactly at `nowMs` occupying a slot forever.
	 */
	static expiredSessions(grants: readonly SessionGrant[], nowMs: number | bigint): SessionGrant[] {
		const now = BigInt(nowMs);
		return grants.filter((g) => now >= g.expiresAtMs);
	}
}

// === Generated bindings ===
// NOTE: this namespace carries the DeepBook spot session calls too
// (`placeLimitOrder`, `placeMarketOrder`, `cancelLiveOrder(s)`, `withdrawSettledAmounts`).
// They are generated and callable; they are simply not wrapped on `SessionsContract`.
export * as sessionsMoveCalls from './contracts/deepbook_sessions/sessions.js';
export * as sessionConfigMoveCalls from './contracts/deepbook_sessions/session_config.js';
export {
	SessionsApp,
	SessionsData,
	SessionAuthorized,
	SessionRevoked,
} from './contracts/deepbook_sessions/sessions.js';
