// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { ClientWithCoreApi, SuiClientTypes } from '@mysten/sui/client';
import { Inputs, Transaction, TransactionCommands } from '@mysten/sui/transactions';
import type {
	Argument,
	CallArg,
	Command,
	TransactionDataBuilder,
	TransactionPlugin,
	TransactionResult,
} from '@mysten/sui/transactions';
import { normalizeStructTag } from '@mysten/sui/utils';

import {
	deriveAccountAddress,
	derivePolicyAddress,
	deriveTemplateAddress,
	deriveTemplateRegistryAddress,
} from './derivation.js';
import { InvalidObjectOwnershipError, PASClientError, PolicyNotFoundError } from './error.js';
import {
	buildMoveCallCommandFromTemplate,
	collectTemplateObjectIds,
	getCommandFromTemplate,
	getRequiredApprovals,
	PASActionType,
} from './resolution.js';
import type { PASPackageConfig } from './types.js';

const PAS_INTENT_NAME = 'PAS';

// ---------------------------------------------------------------------------
// Intent data types
// ---------------------------------------------------------------------------

type SendBalanceIntentData = {
	action: 'sendBalance';
	from: string;
	to: string;
	amount: string;
	assetType: string;
	cfg: PASPackageConfig;
};

type UnlockBalanceIntentData = {
	action: 'unlockBalance';
	from: string;
	amount: string;
	assetType: string;
	cfg: PASPackageConfig;
};

type UnlockUnrestrictedBalanceIntentData = {
	action: 'unlockUnrestrictedBalance';
	from: string;
	amount: string;
	assetType: string;
	cfg: PASPackageConfig;
};

type AccountForAddressIntentData = {
	action: 'accountForAddress';
	owner: string;
	cfg: PASPackageConfig;
};

type PASIntentData =
	| SendBalanceIntentData
	| UnlockBalanceIntentData
	| UnlockUnrestrictedBalanceIntentData
	| AccountForAddressIntentData;

/**
 * Creates a memoized PAS intent closure. On first call it registers the
 * shared resolver and adds the $Intent command; subsequent calls return
 * the cached TransactionResult.
 */
function createPASIntent(data: PASIntentData): (tx: Transaction) => TransactionResult {
	let result: TransactionResult | null = null;
	return (tx: Transaction) => {
		if (result) return result;
		tx.addIntentResolver(PAS_INTENT_NAME, resolvePASIntents);
		result = tx.add(
			TransactionCommands.Intent({
				name: PAS_INTENT_NAME,
				inputs: {},
				data: data as unknown as Record<string, unknown>,
			}),
		);
		return result;
	};
}

export function sendBalanceIntent(
	packageConfig: PASPackageConfig,
): (options: {
	from: string;
	to: string;
	amount: number | bigint;
	assetType: string;
}) => (tx: Transaction) => TransactionResult {
	return ({ from, to, amount, assetType }) =>
		createPASIntent({
			action: 'sendBalance',
			from,
			to,
			amount: String(amount),
			assetType,
			cfg: packageConfig,
		});
}

export function unlockBalanceIntent(
	packageConfig: PASPackageConfig,
): (options: {
	from: string;
	amount: number | bigint;
	assetType: string;
}) => (tx: Transaction) => TransactionResult {
	return ({ from, amount, assetType }) =>
		createPASIntent({
			action: 'unlockBalance',
			from,
			amount: String(amount),
			assetType,
			cfg: packageConfig,
		});
}

export function unlockUnrestrictedBalanceIntent(
	packageConfig: PASPackageConfig,
): (options: {
	from: string;
	amount: number | bigint;
	assetType: string;
}) => (tx: Transaction) => TransactionResult {
	return ({ from, amount, assetType }) =>
		createPASIntent({
			action: 'unlockUnrestrictedBalance',
			from,
			amount: String(amount),
			assetType,
			cfg: packageConfig,
		});
}

export function accountForAddressIntent(
	packageConfig: PASPackageConfig,
): (owner: string) => (tx: Transaction) => TransactionResult {
	return (owner: string) =>
		createPASIntent({ action: 'accountForAddress', owner, cfg: packageConfig });
}

// ---------------------------------------------------------------------------
// Resolver -- holds mutable state shared across all intent builders
// ---------------------------------------------------------------------------
//
// ## How intent resolution works
//
// Each PAS intent occupies a single $Intent slot in the transaction's command
// list. At build time, the resolver replaces each $Intent with a sequence of
// concrete MoveCall commands via `replaceCommand`.
//
// The tricky part is **indexing**. Commands within a PTB reference each
// other's outputs by absolute command index (e.g. `{ Result: 5 }` means
// "the output of command #5"). When we build the replacement commands for
// an intent, we need to know what absolute index each new command will land
// at in the final PTB. That's what `baseIdx` is for:
//
//   baseIdx = the position of the $Intent slot being replaced
//
// So if baseIdx is 3 and we push 2 account-creation commands before the
// new_auth call, new_auth lands at absolute index 5 (= 3 + 2).
//
// The SDK's `replaceCommand` handles index shifting automatically: after
// splicing N commands in place of 1, it adjusts all Result/NestedResult
// references in subsequent commands by (N - 1). So we iterate the live
// command list directly -- no manual offset tracking needed.
//
// Each builder returns a `BuildResult` containing:
//   - `commands`: the replacement commands (local array, 0-indexed)
//   - `resultOffset`: which command in that array produces the intent's
//     output value (so external references to the intent can be remapped)
//

type SuiObject = SuiClientTypes.Object<{ content: true }>;

type AccountState = { kind: 'existing' } | { kind: 'created'; resultIndex: number };

/** Return value from each per-action builder. */
interface BuildResult {
	commands: Command[];
	/** Offset within `commands` of the command whose Result is the intent's output. */
	resultOffset: number;
}

class Resolver {
	/** Pre-fetched on-chain objects (accounts, rules). null = does not exist. */
	readonly objects: Map<string, SuiObject | null>;
	/** Pre-fetched template dynamic field objects. */
	readonly templates: Map<string, SuiObject>;
	/** Pre-parsed template lookup: policyId:actionType -> approval type names. */
	readonly templateApprovals: Map<string, string[]>;
	/** Account existence / creation tracking. */
	readonly accounts: Map<string, AccountState>;

	readonly #tx: TransactionDataBuilder;
	readonly #inputCache = new Map<string, Argument>();
	readonly #templateCommandsCache = new Map<string, ReturnType<typeof getCommandFromTemplate>[]>();
	readonly #config: PASPackageConfig;

	constructor({
		transactionData,
		objects,
		templates,
		templateApprovals,
		accounts,
		config,
	}: {
		transactionData: TransactionDataBuilder;
		objects: Map<string, SuiObject | null>;
		templates: Map<string, SuiObject>;
		templateApprovals: Map<string, string[]>;
		accounts: Map<string, AccountState>;
		config: PASPackageConfig;
	}) {
		this.#tx = transactionData;
		this.objects = objects;
		this.templates = templates;
		this.templateApprovals = templateApprovals;
		this.accounts = accounts;
		this.#config = config;
	}

	// -- Input helpers (deduplicated) ----------------------------------------

	addObjectInput(objectId: string): Argument {
		let arg = this.#inputCache.get(objectId);
		if (!arg) {
			arg = this.#tx.addInput('object', {
				$kind: 'UnresolvedObject',
				UnresolvedObject: { objectId },
			});
			this.#inputCache.set(objectId, arg);
		}
		return arg;
	}

	addPureInput(key: string, value: ReturnType<typeof Inputs.Pure>): Argument {
		let arg = this.#inputCache.get(key);
		if (!arg) {
			arg = this.#tx.addInput('pure', value);
			this.#inputCache.set(key, arg);
		}
		return arg;
	}

	addTemplateInput(type: 'object' | 'pure', arg: CallArg): Argument {
		if (type === 'object' && arg.$kind === 'UnresolvedObject') {
			return this.addObjectInput(arg.UnresolvedObject.objectId);
		}
		return this.#tx.addInput(type, arg);
	}

	// -- Object lookup -------------------------------------------------------

	getObjectOrThrow(objectId: string, errorFactory: () => Error): SuiObject {
		const obj = this.objects.get(objectId);
		if (!obj) throw errorFactory();
		return obj;
	}

	// -- Account resolution ----------------------------------------------------

	/**
	 * Returns an Argument referencing the account for `accountId`.
	 *
	 * - Existing on-chain account: returns an object Input.
	 * - Already created earlier in this PTB: returns the stored Result ref.
	 * - Does not exist yet: **pushes** a `account::create` MoveCall into the
	 *   caller's `commands` array (mutating it) and records the creation so
	 *   subsequent calls for the same account reuse the same Result. The account
	 *   will be shared at the end of the PTB via `shareNewAccounts()`.
	 *
	 * @param commands - The caller's local command array (may be mutated).
	 * @param baseIdx  - Absolute PTB index where `commands[0]` will land.
	 */
	resolveAccountArg(accountId: string, owner: string, baseIdx: number): [Argument, Command[]] {
		const state = this.accounts.get(accountId);
		const commands: Command[] = [];

		if (state?.kind === 'existing') return [this.addObjectInput(accountId), commands];

		if (state?.kind === 'created')
			return [{ $kind: 'Result', Result: state.resultIndex }, commands];

		const absoluteIndex = baseIdx + commands.length;
		commands.push(
			TransactionCommands.MoveCall({
				package: this.#config.packageId,
				module: 'account',
				function: 'create',
				arguments: [
					this.addObjectInput(this.#config.namespaceId),
					this.addPureInput(`address:${owner}`, Inputs.Pure(bcs.Address.serialize(owner))),
				],
			}),
		);

		this.accounts.set(accountId, { kind: 'created', resultIndex: absoluteIndex });
		return [{ $kind: 'Result', Result: absoluteIndex }, commands];
	}

	// -- Template resolution (synchronous, all data pre-fetched) -------------

	resolveTemplateCommands(policyObjectId: string, actionType: PASActionType) {
		const cacheKey = `${policyObjectId}:${actionType}`;
		const cached = this.#templateCommandsCache.get(cacheKey);
		if (cached) return cached;

		const approvalTypeNames = this.templateApprovals.get(cacheKey);
		if (!approvalTypeNames) {
			throw new PASClientError(
				`No required approvals found for action "${actionType}". The issuer has not configured this action.`,
			);
		}

		const templatesId = deriveTemplateRegistryAddress(this.#config);
		const commands = approvalTypeNames.map((tn) => {
			const templateId = deriveTemplateAddress(templatesId, tn);
			const template = this.templates.get(templateId);
			if (!template) {
				throw new PASClientError(
					`Template not found for approval type "${tn}". The issuer has not set up the template command.`,
				);
			}
			return getCommandFromTemplate(template);
		});

		this.#templateCommandsCache.set(cacheKey, commands);
		return commands;
	}

	/**
	 * Replaces a standard action intent (transfer/unlock) with its built
	 * commands. The resolve call at `actualIdx + resultOffset` produces the
	 * intent's output value.
	 */
	replaceIntent(actualIdx: number, commands: Command[], resultOffset: number) {
		this.#tx.replaceCommand(actualIdx, commands, { Result: actualIdx + resultOffset });
	}

	/**
	 * Replaces a accountForAddress intent when the account already exists.
	 * The intent is removed (0 replacement commands) and external references
	 * are remapped to the existing account's Input argument.
	 *
	 * Note: SDK's replaceCommand signature doesn't accept Input args as
	 * resultIndex, but the runtime handles it correctly via ArgumentSchema.parse().
	 */
	replaceIntentWithExistingAccount(actualIdx: number, accountArg: Argument) {
		this.#tx.replaceCommand(actualIdx, [], accountArg as any);
	}

	/**
	 * Replaces a accountForAddress intent when the account needs to be created.
	 * The intent is replaced with the account::create command(s), and external
	 * references are remapped to the first command's Result (the new account).
	 */
	replaceIntentWithCreatedAccount(actualIdx: number, commands: Command[]) {
		this.#tx.replaceCommand(actualIdx, commands, { Result: actualIdx });
	}

	// -- Per-action builders --------------------------------------------------
	//
	// Each builder constructs a local `commands` array representing the
	// sequence of MoveCall commands that replace the intent. Commands
	// reference each other using absolute indices (baseIdx + local offset).
	//
	// The general pattern for a transfer is:
	//   [account::create (0..N)]  -- only if accounts don't exist yet
	//   account::new_auth         -- create ownership proof
	//   account::send_funds   -- initiate the request
	//   [approval commands]     -- issuer-defined template commands
	//   send_funds::resolve -- finalize and produce the output
	//
	// `resultOffset` points at the last command (resolve), whose Result
	// becomes the intent's output value.

	buildSendBalance(data: SendBalanceIntentData, baseIdx: number): BuildResult {
		const { from, to, assetType, amount } = data;
		const fromAccountId = deriveAccountAddress(from, this.#config);
		const toAccountId = deriveAccountAddress(to, this.#config);

		const policyId = derivePolicyAddress(assetType, this.#config);
		const policyObject = this.getObjectOrThrow(policyId, () => new PolicyNotFoundError(assetType));
		const templateCmds = this.resolveTemplateCommands(policyObject.objectId, 'send_funds');

		const [toAccountArg, commands] = this.resolveAccountArg(toAccountId, to, baseIdx);
		const [fromAccountArg, fromAccountCommands] = this.resolveAccountArg(
			fromAccountId,
			from,
			baseIdx + commands.length,
		);
		commands.push(...fromAccountCommands);

		const policyArg = this.addObjectInput(policyId);

		// account::new_auth
		const authIdx = baseIdx + commands.length;
		commands.push(
			TransactionCommands.MoveCall({
				package: this.#config.packageId,
				module: 'account',
				function: 'new_auth',
			}),
		);

		// account::send_funds
		const requestIdx = baseIdx + commands.length;
		commands.push(
			TransactionCommands.MoveCall({
				package: this.#config.packageId,
				module: 'account',
				function: 'send_balance',
				arguments: [
					fromAccountArg,
					{ $kind: 'Result', Result: authIdx },
					toAccountArg,
					this.addTemplateInput('pure', Inputs.Pure(bcs.u64().serialize(BigInt(amount)))),
				],
				typeArguments: [normalizeStructTag(assetType)],
			}),
		);
		const requestArg: Argument = { $kind: 'Result', Result: requestIdx };

		// Issuer-defined approval commands from templates.
		// Template Result/NestedResult indices are relative to the first template
		// command, so we capture the absolute offset before pushing any of them.
		const templateStartIdx = baseIdx + commands.length;
		for (const templateCmd of templateCmds) {
			commands.push(
				buildMoveCallCommandFromTemplate(
					templateCmd,
					{
						addInput: (type, arg) => this.addTemplateInput(type, arg),
						senderAccount: fromAccountArg,
						receiverAccount: toAccountArg,
						policy: policyArg,
						request: requestArg,
						systemType: assetType,
					},
					templateStartIdx,
				),
			);
		}

		// send_funds::resolve
		const resultOffset = commands.length;
		commands.push(
			TransactionCommands.MoveCall({
				package: this.#config.packageId,
				module: 'send_funds',
				function: 'resolve_balance',
				arguments: [requestArg, policyArg],
				typeArguments: [normalizeStructTag(assetType)],
			}),
		);

		return { commands, resultOffset };
	}

	/**
	 * Builds commands for both restricted and unrestricted unlock flows.
	 * Restricted: requires a Policy, runs issuer approval templates, then resolve.
	 * Unrestricted: no Policy needed, calls resolve_unrestricted_balance directly.
	 */
	buildUnlockBalance(
		data: UnlockBalanceIntentData | UnlockUnrestrictedBalanceIntentData,
		baseIdx: number,
	): BuildResult {
		const { from, assetType, amount } = data;
		const fromAccountId = deriveAccountAddress(from, this.#config);
		const policyId = derivePolicyAddress(assetType, this.#config);

		const isRestricted = data.action === 'unlockBalance';

		if (isRestricted) {
			this.getObjectOrThrow(
				policyId,
				() =>
					new PASClientError(
						`Policy does not exist for asset type ${assetType}. ` +
							`That means that the issuer has not yet enabled funds management for this asset. ` +
							`If this is a non-managed asset, you can use the unrestricted unlock flow by calling unlockUnrestrictedBalance() instead.`,
					),
			);
		} else {
			if (this.objects.get(policyId) !== null) {
				throw new PASClientError(
					`A policy exists for asset type ${assetType}. That means that the issuer has enabled funds management for this asset and you can no longer use the unrestricted unlock flow.`,
				);
			}
		}

		const [fromAccountArg, commands] = this.resolveAccountArg(fromAccountId, from, baseIdx);
		const policyArg = isRestricted ? this.addObjectInput(policyId) : undefined;

		// account::new_auth
		const authIdx = baseIdx + commands.length;
		commands.push(
			TransactionCommands.MoveCall({
				package: this.#config.packageId,
				module: 'account',
				function: 'new_auth',
			}),
		);

		// account::unlock_funds
		const requestIdx = baseIdx + commands.length;
		commands.push(
			TransactionCommands.MoveCall({
				package: this.#config.packageId,
				module: 'account',
				function: 'unlock_balance',
				arguments: [
					fromAccountArg,
					{ $kind: 'Result', Result: authIdx },
					this.addTemplateInput('pure', Inputs.Pure(bcs.u64().serialize(BigInt(amount)))),
				],
				typeArguments: [normalizeStructTag(assetType)],
			}),
		);
		const requestArg: Argument = { $kind: 'Result', Result: requestIdx };

		if (isRestricted) {
			// Issuer-defined approval commands from templates.
			const templateCmds = this.resolveTemplateCommands(policyId, 'unlock_funds');
			const templateStartIdx = baseIdx + commands.length;
			for (const templateCmd of templateCmds) {
				commands.push(
					buildMoveCallCommandFromTemplate(
						templateCmd,
						{
							addInput: (type, arg) => this.addTemplateInput(type, arg),
							senderAccount: fromAccountArg,
							policy: policyArg,
							request: requestArg,
							systemType: assetType,
						},
						templateStartIdx,
					),
				);
			}

			// unlock_funds::resolve
			const resultOffset = commands.length;
			commands.push(
				TransactionCommands.MoveCall({
					package: this.#config.packageId,
					module: 'unlock_funds',
					function: 'resolve',
					arguments: [requestArg, policyArg!],
					typeArguments: [normalizeStructTag(assetType)],
				}),
			);
			return { commands, resultOffset };
		}

		// unlock_funds::resolve_unrestricted_balance
		const resultOffset = commands.length;
		commands.push(
			TransactionCommands.MoveCall({
				package: this.#config.packageId,
				module: 'unlock_funds',
				function: 'resolve_unrestricted_balance',
				arguments: [requestArg, this.addObjectInput(this.#config.namespaceId)],
				typeArguments: [normalizeStructTag(assetType)],
			}),
		);
		return { commands, resultOffset };
	}

	// -- Finalization ---------------------------------------------------------

	/**
	 * Appends `account::share` commands for every account that was created during
	 * resolution. Called once at the end, after all intents have been resolved,
	 * so that each account is shared exactly once regardless of how many intents
	 * referenced it.
	 */
	shareNewAccounts() {
		for (const state of this.accounts.values()) {
			if (state.kind !== 'created') continue;
			this.#tx.commands.push(
				TransactionCommands.MoveCall({
					package: this.#config.packageId,
					module: 'account',
					function: 'share',
					arguments: [{ $kind: 'Result', Result: state.resultIndex }],
				}),
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Data collection + fetching (pre-resolution)
// ---------------------------------------------------------------------------

type AccountOwner = { owner: string };

interface IntentDataCollection {
	objectIds: Set<string>;
	accountRequests: Map<string, AccountOwner>;
	intentDataList: PASIntentData[];
	cfg: PASPackageConfig;
}

/** Scans commands for PAS intents and collects the object IDs we need to fetch. */
function collectIntentData(commands: readonly Command[]): IntentDataCollection | null {
	const objectIds = new Set<string>();
	const accountRequests = new Map<string, AccountOwner>();
	const intentDataList: PASIntentData[] = [];
	let cfg: PASPackageConfig | null = null;

	for (const command of commands) {
		if (command.$kind !== '$Intent' || command.$Intent.name !== PAS_INTENT_NAME) continue;
		const data = command.$Intent.data as unknown as PASIntentData;

		if (!cfg) cfg = data.cfg;
		intentDataList.push(data);

		switch (data.action) {
			case 'sendBalance': {
				const fromId = deriveAccountAddress(data.from, cfg);
				const toId = deriveAccountAddress(data.to, cfg);
				objectIds.add(fromId);
				objectIds.add(toId);
				objectIds.add(derivePolicyAddress(data.assetType, cfg));
				accountRequests.set(fromId, { owner: data.from });
				accountRequests.set(toId, { owner: data.to });
				break;
			}
			case 'unlockBalance':
			case 'unlockUnrestrictedBalance': {
				const fromId = deriveAccountAddress(data.from, cfg);
				objectIds.add(fromId);
				objectIds.add(derivePolicyAddress(data.assetType, cfg));
				accountRequests.set(fromId, { owner: data.from });
				break;
			}
			case 'accountForAddress': {
				const id = deriveAccountAddress(data.owner, cfg);
				objectIds.add(id);
				accountRequests.set(id, { owner: data.owner });
				break;
			}
		}
	}

	if (!cfg)
		throw new PASClientError('No package configuration found in intents. This is an internal bug.');

	return intentDataList.length > 0 ? { objectIds, accountRequests, intentDataList, cfg } : null;
}

async function initializeContext(
	transactionData: TransactionDataBuilder,
	client: ClientWithCoreApi,
	objectIds: Set<string>,
	accountRequests: Map<string, AccountOwner>,
	intentDataList: PASIntentData[],
	config: PASPackageConfig,
): Promise<Resolver> {
	// 1. Batch-fetch all accounts + rules
	const allIds = [...objectIds];
	const { objects: fetched } = await client.core.getObjects({
		objectIds: allIds,
		include: { content: true },
	});

	const objects = new Map<string, SuiObject | null>();

	for (const id of allIds) {
		const obj = fetched.filter((o) => 'content' in o).find((o) => o.objectId === id);
		objects.set(id, obj ?? null);
	}

	// 2. Build initial account map (existing vs needs-creation)
	const accounts = new Map<string, AccountState>();
	for (const [accountId] of accountRequests) {
		if (objects.get(accountId) !== null) {
			accounts.set(accountId, { kind: 'existing' });
		}
	}

	// 3. Collect template DF IDs by parsing rules
	const templateApprovals = new Map<string, string[]>();
	const templateIds: string[] = [];
	const seen = new Set<string>();

	for (const data of intentDataList) {
		let actionType: PASActionType | null = null;
		let assetType: string | null = null;

		if (data.action === 'sendBalance') {
			actionType = 'send_funds';
			assetType = data.assetType;
		} else if (data.action === 'unlockBalance') {
			actionType = 'unlock_funds';
			assetType = data.assetType;
		}

		if (!actionType || !assetType) continue;

		const policyId = derivePolicyAddress(assetType, config);
		const key = `${policyId}:${actionType}`;
		if (seen.has(key)) continue;
		seen.add(key);

		const policyObject = objects.get(policyId);
		if (!policyObject) continue;

		const approvalTypeNames = getRequiredApprovals(policyObject, actionType);
		if (!approvalTypeNames?.length) continue;

		const templatesId = deriveTemplateRegistryAddress(config);
		templateApprovals.set(key, approvalTypeNames);
		templateIds.push(...approvalTypeNames.map((tn) => deriveTemplateAddress(templatesId, tn)));
	}

	// 4. Batch-fetch all template data
	const templates = new Map<string, SuiObject>();
	if (templateIds.length > 0) {
		const { objects: templateObjects } = await client.core.getObjects({
			objectIds: templateIds,
			include: { content: true },
		});

		for (const obj of templateObjects.filter((o) => 'content' in o)) {
			templates.set(obj.objectId, obj);
		}
	}

	// 5. Validate that all objects referenced by templates are shared or immutable.
	await validateTemplateObjects(client, Array.from(templates.values()));

	return new Resolver({
		transactionData,
		objects,
		templates,
		templateApprovals,
		accounts,
		config,
	});
}

const resolvePASIntents: TransactionPlugin = async (transactionData, buildOptions, next) => {
	const client = buildOptions.client;
	if (!client)
		throw new PASClientError(
			'A SuiClient must be provided to build transactions with PAS intents.',
		);

	const requirements = collectIntentData(transactionData.commands);
	if (!requirements) return next();

	const { objectIds, accountRequests, intentDataList, cfg } = requirements;

	const ctx = await initializeContext(
		transactionData,
		client,
		objectIds,
		accountRequests,
		intentDataList,
		cfg,
	);

	// Always advance by 1 so we never skip (e.g. a replacement that contains another intent).
	// When we replace with 0 commands we decrement so the loop's increment nets 0 and we
	// re-read the slot (where the next intent shifted in).
	for (let index = 0; index < transactionData.commands.length; index++) {
		const command = transactionData.commands[index];
		if (command.$kind !== '$Intent' || command.$Intent.name !== PAS_INTENT_NAME) continue;

		const data = command.$Intent.data as unknown as PASIntentData;

		if (data.action === 'accountForAddress') {
			const accountId = deriveAccountAddress(data.owner, cfg);
			const [accountArg, commands] = ctx.resolveAccountArg(accountId, data.owner, index);

			if (commands.length === 0) {
				ctx.replaceIntentWithExistingAccount(index, accountArg);
				index--; // Next iteration will ++, so we re-read this index (next intent moved here)
			} else {
				ctx.replaceIntentWithCreatedAccount(index, commands);
			}
			continue;
		}

		let result: BuildResult;
		switch (data.action) {
			case 'sendBalance':
				result = ctx.buildSendBalance(data, index);
				break;
			case 'unlockBalance':
			case 'unlockUnrestrictedBalance':
				result = ctx.buildUnlockBalance(data, index);
				break;
			default:
				continue;
		}

		ctx.replaceIntent(index, result.commands, result.resultOffset);
	}

	ctx.shareNewAccounts();
	return next();
};

/**
 * Parses all template commands, collects every object they reference
 * (fully-resolved refs, shared refs, and ext lookups), batch-fetches
 * their current state, and rejects any that are not shared or immutable.
 */
export async function validateTemplateObjects(
	client: ClientWithCoreApi,
	templates: SuiObject[],
): Promise<void> {
	const allTemplateCommands = templates.map(getCommandFromTemplate);
	const objectIds = collectTemplateObjectIds(allTemplateCommands);

	if (objectIds.size === 0) return;

	const { objects: fetchedObjects } = await client.core.getObjects({
		objectIds: [...objectIds],
	});

	for (const obj of fetchedObjects) {
		if (obj instanceof Error)
			throw new PASClientError('Failed to fetch template object: ' + obj.message);

		if (obj.owner.$kind !== 'Shared' && obj.owner.$kind !== 'Immutable') {
			throw new InvalidObjectOwnershipError(obj.objectId, obj.owner.$kind);
		}
	}
}
