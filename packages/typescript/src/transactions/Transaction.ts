// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { SerializedBcs } from '@mysten/bcs';
import { fromBase64, isSerializedBcs } from '@mysten/bcs';
import type { InferInput } from 'valibot';
import { is, parse } from 'valibot';

import type { SignatureWithBytes, Signer } from '../cryptography/index.js';
import { normalizeSuiAddress } from '../utils/sui-types.js';
import type { TransactionArgument } from './Commands.js';
import { Commands } from './Commands.js';
import type { CallArg, Command, Argument, ObjectRef } from './data/internal.js';
import {
	ArgumentSchema,
	NormalizedCallArg,
	ObjectRefSchema,
	TransactionExpiration,
} from './data/internal.js';
import { serializeV1TransactionData } from './data/v1.js';
import { SerializedTransactionDataV2Schema } from './data/v2.js';
import { Inputs } from './Inputs.js';
import { needsTransactionResolution, resolveTransactionPlugin } from './resolve.js';
import type {
	BuildTransactionOptions,
	SerializeTransactionOptions,
	TransactionPlugin,
} from './resolve.js';
import { createObjectMethods } from './object.js';
import { createPure } from './pure.js';
import { TransactionDataBuilder } from './TransactionData.js';
import { getIdFromCallArg } from './utils.js';
import { namedPackagesPlugin } from './plugins/NamedPackagesPlugin.js';
import type { ClientWithCoreApi } from '../experimental/core.js';

export type TransactionObjectArgument =
	| Exclude<InferInput<typeof ArgumentSchema>, { Input: unknown; type?: 'pure' }>
	| ((
			tx: Transaction,
	  ) => Exclude<InferInput<typeof ArgumentSchema>, { Input: unknown; type?: 'pure' }>)
	| AsyncTransactionThunk<TransactionResultArgument>;

export type TransactionResult = Extract<Argument, { Result: unknown }> &
	Extract<Argument, { NestedResult: unknown }>[];

export type TransactionResultArgument =
	| Extract<Argument, { Result: unknown }>
	| readonly Extract<Argument, { NestedResult: unknown }>[];

export type AsyncTransactionThunk<
	T extends TransactionResultArgument | void = TransactionResultArgument | void,
> = (tx: Transaction) => Promise<T | void>;

function createTransactionResult(
	index: number | (() => number),
	length = Infinity,
): TransactionResult {
	const baseResult = {
		$kind: 'Result' as const,
		get Result() {
			return typeof index === 'function' ? index() : index;
		},
	};

	const nestedResults: {
		$kind: 'NestedResult';
		NestedResult: [number, number];
	}[] = [];
	const nestedResultFor = (
		resultIndex: number,
	): {
		$kind: 'NestedResult';
		NestedResult: [number, number];
	} =>
		(nestedResults[resultIndex] ??= {
			$kind: 'NestedResult' as const,
			get NestedResult() {
				return [typeof index === 'function' ? index() : index, resultIndex] as [number, number];
			},
		});

	return new Proxy(baseResult, {
		set() {
			throw new Error(
				'The transaction result is a proxy, and does not support setting properties directly',
			);
		},
		// TODO: Instead of making this return a concrete argument, we should ideally
		// make it reference-based (so that this gets resolved at build-time), which
		// allows re-ordering transactions.
		get(target, property) {
			// This allows this transaction argument to be used in the singular form:
			if (property in target) {
				return Reflect.get(target, property);
			}

			// Support destructuring:
			if (property === Symbol.iterator) {
				return function* () {
					let i = 0;
					while (i < length) {
						yield nestedResultFor(i);
						i++;
					}
				};
			}

			if (typeof property === 'symbol') return;

			const resultIndex = parseInt(property, 10);
			if (Number.isNaN(resultIndex) || resultIndex < 0) return;
			return nestedResultFor(resultIndex);
		},
	}) as TransactionResult;
}

const TRANSACTION_BRAND = Symbol.for('@mysten/transaction') as never;

interface SignOptions extends BuildTransactionOptions {
	signer: Signer;
}

export function isTransaction(obj: unknown): obj is TransactionLike {
	return !!obj && typeof obj === 'object' && (obj as any)[TRANSACTION_BRAND] === true;
}

export type TransactionObjectInput = string | CallArg | TransactionObjectArgument;

interface TransactionPluginRegistry {
	// eslint-disable-next-line @typescript-eslint/ban-types
	buildPlugins: Map<string | Function, TransactionPlugin>;
	// eslint-disable-next-line @typescript-eslint/ban-types
	serializationPlugins: Map<string | Function, TransactionPlugin>;
}

const modulePluginRegistry: TransactionPluginRegistry = {
	buildPlugins: new Map(),
	serializationPlugins: new Map(),
};

const TRANSACTION_REGISTRY_KEY = Symbol.for('@mysten/transaction/registry');
function getGlobalPluginRegistry() {
	try {
		const target = globalThis as {
			[TRANSACTION_REGISTRY_KEY]?: TransactionPluginRegistry;
		};

		if (!target[TRANSACTION_REGISTRY_KEY]) {
			target[TRANSACTION_REGISTRY_KEY] = modulePluginRegistry;
		}

		return target[TRANSACTION_REGISTRY_KEY];
	} catch {
		return modulePluginRegistry;
	}
}

type InputSection = (CallArg | InputSection)[];
type CommandSection = (Command | CommandSection)[];

type TransactionLike = {
	getData(): unknown;
};

/**
 * Transaction Builder
 */
export class Transaction {
	#serializationPlugins: TransactionPlugin[];
	#buildPlugins: TransactionPlugin[];
	#intentResolvers = new Map<string, TransactionPlugin>();
	#inputSection: InputSection = [];
	#commandSection: CommandSection = [];
	#availableResults: Set<number> = new Set();
	#pendingPromises = new Set<Promise<unknown>>();
	#added = new Map<(...args: any[]) => unknown, unknown>();

	/**
	 * Converts from a serialize transaction kind (built with `build({ onlyTransactionKind: true })`) to a `Transaction` class.
	 * Supports either a byte array, or base64-encoded bytes.
	 */
	static fromKind(serialized: string | Uint8Array) {
		const tx = new Transaction();

		tx.#data = TransactionDataBuilder.fromKindBytes(
			typeof serialized === 'string' ? fromBase64(serialized) : serialized,
		);

		tx.#inputSection = tx.#data.inputs.slice();
		tx.#commandSection = tx.#data.commands.slice();
		tx.#availableResults = new Set(tx.#commandSection.map((_, i) => i));

		return tx;
	}

	/**
	 * Converts from a serialized transaction format to a `Transaction` class.
	 * There are two supported serialized formats:
	 * - A string returned from `Transaction#serialize`. The serialized format must be compatible, or it will throw an error.
	 * - A byte array (or base64-encoded bytes) containing BCS transaction data.
	 */
	static from(transaction: string | Uint8Array | TransactionLike) {
		const newTransaction = new Transaction();

		if (isTransaction(transaction)) {
			newTransaction.#data = TransactionDataBuilder.restore(
				transaction.getData() as InferInput<typeof SerializedTransactionDataV2Schema>,
			);
		} else if (typeof transaction !== 'string' || !transaction.startsWith('{')) {
			newTransaction.#data = TransactionDataBuilder.fromBytes(
				typeof transaction === 'string' ? fromBase64(transaction) : transaction,
			);
		} else {
			newTransaction.#data = TransactionDataBuilder.restore(JSON.parse(transaction));
		}

		newTransaction.#inputSection = newTransaction.#data.inputs.slice();
		newTransaction.#commandSection = newTransaction.#data.commands.slice();
		newTransaction.#availableResults = new Set(newTransaction.#commandSection.map((_, i) => i));

		return newTransaction;
	}

	/** @deprecated global plugins should be registered with a name */
	static registerGlobalSerializationPlugin(step: TransactionPlugin): void;
	static registerGlobalSerializationPlugin(name: string, step: TransactionPlugin): void;
	static registerGlobalSerializationPlugin(
		stepOrStep: TransactionPlugin | string,
		step?: TransactionPlugin,
	) {
		getGlobalPluginRegistry().serializationPlugins.set(
			stepOrStep,
			step ?? (stepOrStep as TransactionPlugin),
		);
	}

	static unregisterGlobalSerializationPlugin(name: string) {
		getGlobalPluginRegistry().serializationPlugins.delete(name);
	}

	/** @deprecated global plugins should be registered with a name */
	static registerGlobalBuildPlugin(step: TransactionPlugin): void;
	static registerGlobalBuildPlugin(name: string, step: TransactionPlugin): void;
	static registerGlobalBuildPlugin(
		stepOrStep: TransactionPlugin | string,
		step?: TransactionPlugin,
	) {
		getGlobalPluginRegistry().buildPlugins.set(
			stepOrStep,
			step ?? (stepOrStep as TransactionPlugin),
		);
	}

	static unregisterGlobalBuildPlugin(name: string) {
		getGlobalPluginRegistry().buildPlugins.delete(name);
	}

	addSerializationPlugin(step: TransactionPlugin) {
		this.#serializationPlugins.push(step);
	}

	addBuildPlugin(step: TransactionPlugin) {
		this.#buildPlugins.push(step);
	}

	addIntentResolver(intent: string, resolver: TransactionPlugin) {
		if (this.#intentResolvers.has(intent) && this.#intentResolvers.get(intent) !== resolver) {
			throw new Error(`Intent resolver for ${intent} already exists`);
		}

		this.#intentResolvers.set(intent, resolver);
	}

	setSender(sender: string) {
		this.#data.sender = sender;
	}
	/**
	 * Sets the sender only if it has not already been set.
	 * This is useful for sponsored transaction flows where the sender may not be the same as the signer address.
	 */
	setSenderIfNotSet(sender: string) {
		if (!this.#data.sender) {
			this.#data.sender = sender;
		}
	}
	setExpiration(expiration?: InferInput<typeof TransactionExpiration> | null) {
		this.#data.expiration = expiration ? parse(TransactionExpiration, expiration) : null;
	}
	setGasPrice(price: number | bigint) {
		this.#data.gasConfig.price = String(price);
	}
	setGasBudget(budget: number | bigint) {
		this.#data.gasConfig.budget = String(budget);
	}

	setGasBudgetIfNotSet(budget: number | bigint) {
		if (this.#data.gasData.budget == null) {
			this.#data.gasConfig.budget = String(budget);
		}
	}

	setGasOwner(owner: string) {
		this.#data.gasConfig.owner = owner;
	}
	setGasPayment(payments: ObjectRef[]) {
		this.#data.gasConfig.payment = payments.map((payment) => parse(ObjectRefSchema, payment));
	}

	#data: TransactionDataBuilder;

	/** @deprecated Use `getData()` instead. */
	get blockData() {
		return serializeV1TransactionData(this.#data.snapshot());
	}

	/** Get a snapshot of the transaction data, in JSON form: */
	getData() {
		return this.#data.snapshot();
	}

	// Used to brand transaction classes so that they can be identified, even between multiple copies
	// of the builder.
	get [TRANSACTION_BRAND]() {
		return true;
	}

	// Temporary workaround for the wallet interface accidentally serializing transactions via postMessage
	get pure(): ReturnType<typeof createPure<Argument>> {
		Object.defineProperty(this, 'pure', {
			enumerable: false,
			value: createPure<Argument>((value): Argument => {
				if (isSerializedBcs(value)) {
					return this.#addInput('pure', {
						$kind: 'Pure',
						Pure: {
							bytes: value.toBase64(),
						},
					});
				}

				// TODO: we can also do some deduplication here
				return this.#addInput(
					'pure',
					is(NormalizedCallArg, value)
						? parse(NormalizedCallArg, value)
						: value instanceof Uint8Array
							? Inputs.Pure(value)
							: { $kind: 'UnresolvedPure', UnresolvedPure: { value } },
				);
			}),
		});

		return this.pure;
	}

	constructor() {
		const globalPlugins = getGlobalPluginRegistry();
		this.#data = new TransactionDataBuilder();
		this.#buildPlugins = [...globalPlugins.buildPlugins.values()];
		this.#serializationPlugins = [...globalPlugins.serializationPlugins.values()];
	}

	/** Returns an argument for the gas coin, to be used in a transaction. */
	get gas() {
		return { $kind: 'GasCoin' as const, GasCoin: true as const };
	}

	/**
	 * Add a new object input to the transaction.
	 */
	object: ReturnType<
		typeof createObjectMethods<{ $kind: 'Input'; Input: number; type?: 'object' }>
	> = createObjectMethods(
		(value: TransactionObjectInput): { $kind: 'Input'; Input: number; type?: 'object' } => {
			if (typeof value === 'function') {
				return this.object(this.add(value as (tx: Transaction) => TransactionObjectArgument));
			}

			if (typeof value === 'object' && is(ArgumentSchema, value)) {
				return value as { $kind: 'Input'; Input: number; type?: 'object' };
			}

			const id = getIdFromCallArg(value);

			const inserted = this.#data.inputs.find((i) => id === getIdFromCallArg(i));

			// Upgrade shared object inputs to mutable if needed:
			if (
				inserted?.Object?.SharedObject &&
				typeof value === 'object' &&
				value.Object?.SharedObject
			) {
				inserted.Object.SharedObject.mutable =
					inserted.Object.SharedObject.mutable || value.Object.SharedObject.mutable;
			}

			return inserted
				? { $kind: 'Input', Input: this.#data.inputs.indexOf(inserted), type: 'object' }
				: this.#addInput(
						'object',
						typeof value === 'string'
							? {
									$kind: 'UnresolvedObject',
									UnresolvedObject: { objectId: normalizeSuiAddress(value) },
								}
							: value,
					);
		},
	);

	/**
	 * Add a new object input to the transaction using the fully-resolved object reference.
	 * If you only have an object ID, use `builder.object(id)` instead.
	 */
	objectRef(...args: Parameters<(typeof Inputs)['ObjectRef']>) {
		return this.object(Inputs.ObjectRef(...args));
	}

	/**
	 * Add a new receiving input to the transaction using the fully-resolved object reference.
	 * If you only have an object ID, use `builder.object(id)` instead.
	 */
	receivingRef(...args: Parameters<(typeof Inputs)['ReceivingRef']>) {
		return this.object(Inputs.ReceivingRef(...args));
	}

	/**
	 * Add a new shared object input to the transaction using the fully-resolved shared object reference.
	 * If you only have an object ID, use `builder.object(id)` instead.
	 */
	sharedObjectRef(...args: Parameters<(typeof Inputs)['SharedObjectRef']>) {
		return this.object(Inputs.SharedObjectRef(...args));
	}

	#fork() {
		const fork = new Transaction();

		fork.#data = this.#data;
		fork.#serializationPlugins = this.#serializationPlugins;
		fork.#buildPlugins = this.#buildPlugins;
		fork.#intentResolvers = this.#intentResolvers;
		fork.#pendingPromises = this.#pendingPromises;
		fork.#availableResults = new Set(this.#availableResults);
		fork.#added = this.#added;
		this.#inputSection.push(fork.#inputSection);
		this.#commandSection.push(fork.#commandSection);

		return fork;
	}

	/** Add a transaction to the transaction */

	add<T extends Command>(command: T): TransactionResult;
	add<T extends void | TransactionResultArgument | TransactionArgument | Command>(
		thunk: (tx: Transaction) => T,
	): T;
	add<T extends TransactionResultArgument | void>(
		asyncTransactionThunk: AsyncTransactionThunk<T>,
	): T;
	add(command: Command | AsyncTransactionThunk | ((tx: Transaction) => unknown)): unknown {
		if (typeof command === 'function') {
			if (this.#added.has(command)) {
				return this.#added.get(command);
			}

			const fork = this.#fork();
			const result = command(fork);

			if (!(result && typeof result === 'object' && 'then' in result)) {
				this.#availableResults = fork.#availableResults;
				this.#added.set(command, result);
				return result;
			}

			const placeholder = this.#addCommand({
				$kind: '$Intent',
				$Intent: {
					name: 'AsyncTransactionThunk',
					inputs: {},
					data: {
						resultIndex: this.#data.commands.length,
						result: null as TransactionResult | null,
					},
				},
			});

			this.#pendingPromises.add(
				Promise.resolve(result as Promise<TransactionResult>).then((result) => {
					placeholder.$Intent.data.result = result;
				}),
			);
			const txResult = createTransactionResult(() => placeholder.$Intent.data.resultIndex);
			this.#added.set(command, txResult);
			return txResult;
		} else {
			this.#addCommand(command);
		}

		return createTransactionResult(this.#data.commands.length - 1);
	}

	#addCommand<T extends Command>(command: T) {
		const resultIndex = this.#data.commands.length;
		this.#commandSection.push(command);
		this.#availableResults.add(resultIndex);
		this.#data.commands.push(command);

		this.#data.mapCommandArguments(resultIndex, (arg) => {
			if (arg.$kind === 'Result' && !this.#availableResults.has(arg.Result)) {
				throw new Error(
					`Result { Result: ${arg.Result} } is not available to use in the current transaction`,
				);
			}

			if (arg.$kind === 'NestedResult' && !this.#availableResults.has(arg.NestedResult[0])) {
				throw new Error(
					`Result { NestedResult: [${arg.NestedResult[0]}, ${arg.NestedResult[1]}] } is not available to use in the current transaction`,
				);
			}

			if (arg.$kind === 'Input' && arg.Input >= this.#data.inputs.length) {
				throw new Error(
					`Input { Input: ${arg.Input} } references an input that does not exist in the current transaction`,
				);
			}

			return arg;
		});

		return command;
	}

	#addInput<T extends 'pure' | 'object'>(type: T, input: CallArg) {
		this.#inputSection.push(input);
		return this.#data.addInput(type, input);
	}

	#normalizeTransactionArgument(arg: TransactionArgument | SerializedBcs<any>) {
		if (isSerializedBcs(arg)) {
			return this.pure(arg);
		}

		return this.#resolveArgument(arg as TransactionArgument);
	}

	#resolveArgument(arg: TransactionArgument): Argument {
		if (typeof arg === 'function') {
			const resolved = this.add(arg as never);

			if (typeof resolved === 'function') {
				return this.#resolveArgument(resolved);
			}

			return parse(ArgumentSchema, resolved);
		}

		return parse(ArgumentSchema, arg);
	}

	// Method shorthands:

	splitCoins<
		const Amounts extends (TransactionArgument | SerializedBcs<any> | number | string | bigint)[],
	>(coin: TransactionObjectArgument | string, amounts: Amounts) {
		const command = Commands.SplitCoins(
			typeof coin === 'string' ? this.object(coin) : this.#resolveArgument(coin),
			amounts.map((amount) =>
				typeof amount === 'number' || typeof amount === 'bigint' || typeof amount === 'string'
					? this.pure.u64(amount)
					: this.#normalizeTransactionArgument(amount),
			),
		);
		this.#addCommand(command);
		return createTransactionResult(this.#data.commands.length - 1, amounts.length) as Extract<
			Argument,
			{ Result: unknown }
		> & {
			[K in keyof Amounts]: Extract<Argument, { NestedResult: unknown }>;
		};
	}
	mergeCoins(
		destination: TransactionObjectArgument | string,
		sources: (TransactionObjectArgument | string)[],
	) {
		return this.add(
			Commands.MergeCoins(
				this.object(destination),
				sources.map((src) => this.object(src)),
			),
		);
	}
	publish({ modules, dependencies }: { modules: number[][] | string[]; dependencies: string[] }) {
		return this.add(
			Commands.Publish({
				modules,
				dependencies,
			}),
		);
	}
	upgrade({
		modules,
		dependencies,
		package: packageId,
		ticket,
	}: {
		modules: number[][] | string[];
		dependencies: string[];
		package: string;
		ticket: TransactionObjectArgument | string;
	}) {
		return this.add(
			Commands.Upgrade({
				modules,
				dependencies,
				package: packageId,
				ticket: this.object(ticket),
			}),
		);
	}
	moveCall({
		arguments: args,
		...input
	}:
		| {
				package: string;
				module: string;
				function: string;
				arguments?: (TransactionArgument | SerializedBcs<any>)[];
				typeArguments?: string[];
		  }
		| {
				target: string;
				arguments?: (TransactionArgument | SerializedBcs<any>)[];
				typeArguments?: string[];
		  }) {
		return this.add(
			Commands.MoveCall({
				...input,
				arguments: args?.map((arg) => this.#normalizeTransactionArgument(arg)),
			} as Parameters<typeof Commands.MoveCall>[0]),
		);
	}
	transferObjects(
		objects: (TransactionObjectArgument | string)[],
		address: TransactionArgument | SerializedBcs<any> | string,
	) {
		return this.add(
			Commands.TransferObjects(
				objects.map((obj) => this.object(obj)),
				typeof address === 'string'
					? this.pure.address(address)
					: this.#normalizeTransactionArgument(address),
			),
		);
	}
	makeMoveVec({
		type,
		elements,
	}: {
		elements: (TransactionObjectArgument | string)[];
		type?: string;
	}) {
		return this.add(
			Commands.MakeMoveVec({
				type,
				elements: elements.map((obj) => this.object(obj)),
			}),
		);
	}

	/**
	 * @deprecated Use toJSON instead.
	 * For synchronous serialization, you can use `getData()`
	 * */
	serialize() {
		return JSON.stringify(serializeV1TransactionData(this.#data.snapshot()));
	}

	async toJSON(options: SerializeTransactionOptions = {}): Promise<string> {
		await this.prepareForSerialization(options);
		const fullyResolved = this.isFullyResolved();
		return JSON.stringify(
			parse(
				SerializedTransactionDataV2Schema,
				fullyResolved
					? {
							...this.#data.snapshot(),
							digest: this.#data.getDigest(),
						}
					: this.#data.snapshot(),
			),
			(_key, value) => (typeof value === 'bigint' ? value.toString() : value),
			2,
		);
	}

	/** Build the transaction to BCS bytes, and sign it with the provided keypair. */
	async sign(options: SignOptions): Promise<SignatureWithBytes> {
		const { signer, ...buildOptions } = options;
		const bytes = await this.build(buildOptions);
		return signer.signTransaction(bytes);
	}

	/**
	 *  Ensures that:
	 *  - All objects have been fully resolved to a specific version
	 *  - All pure inputs have been serialized to bytes
	 *  - All async thunks have been fully resolved
	 *  - All transaction intents have been resolved
	 * 	- The gas payment, budget, and price have been set
	 *  - The transaction sender has been set
	 *
	 *  When true, the transaction will always be built to the same bytes and digest (unless the transaction is mutated)
	 */
	isFullyResolved() {
		if (!this.#data.sender) {
			return false;
		}

		if (this.#pendingPromises.size > 0) {
			return false;
		}

		if (this.#data.commands.some((cmd) => cmd.$Intent)) {
			return false;
		}

		if (needsTransactionResolution(this.#data, {})) {
			return false;
		}

		return true;
	}

	/** Build the transaction to BCS bytes. */
	async build(options: BuildTransactionOptions = {}): Promise<Uint8Array<ArrayBuffer>> {
		await this.prepareForSerialization(options);
		await this.#prepareBuild(options);
		return this.#data.build({
			onlyTransactionKind: options.onlyTransactionKind,
		});
	}

	/** Derive transaction digest */
	async getDigest(
		options: {
			client?: ClientWithCoreApi;
		} = {},
	): Promise<string> {
		await this.prepareForSerialization(options);
		await this.#prepareBuild(options);
		return this.#data.getDigest();
	}

	/**
	 * Prepare the transaction by validating the transaction data and resolving all inputs
	 * so that it can be built into bytes.
	 */
	async #prepareBuild(options: BuildTransactionOptions) {
		if (!options.onlyTransactionKind && !this.#data.sender) {
			throw new Error('Missing transaction sender');
		}

		await this.#runPlugins([...this.#buildPlugins, resolveTransactionPlugin], options);
	}

	async #runPlugins(plugins: TransactionPlugin[], options: SerializeTransactionOptions) {
		try {
			const createNext = (i: number) => {
				if (i >= plugins.length) {
					return () => {};
				}
				const plugin = plugins[i];

				return async () => {
					const next = createNext(i + 1);
					let calledNext = false;
					let nextResolved = false;

					await plugin(this.#data, options, async () => {
						if (calledNext) {
							throw new Error(`next() was call multiple times in TransactionPlugin ${i}`);
						}

						calledNext = true;

						await next();

						nextResolved = true;
					});

					if (!calledNext) {
						throw new Error(`next() was not called in TransactionPlugin ${i}`);
					}

					if (!nextResolved) {
						throw new Error(`next() was not awaited in TransactionPlugin ${i}`);
					}
				};
			};

			await createNext(0)();
		} finally {
			this.#inputSection = this.#data.inputs.slice();
			this.#commandSection = this.#data.commands.slice();
		}
	}

	async #waitForPendingTasks() {
		while (this.#pendingPromises.size > 0) {
			const newPromise = Promise.all(this.#pendingPromises);
			this.#pendingPromises.clear();
			this.#pendingPromises.add(newPromise);
			await newPromise;
			this.#pendingPromises.delete(newPromise);
		}
	}

	#sortCommandsAndInputs() {
		const unorderedCommands = this.#data.commands;
		const unorderedInputs = this.#data.inputs;

		const orderedCommands = (this.#commandSection as Command[]).flat(Infinity);
		const orderedInputs = (this.#inputSection as CallArg[]).flat(Infinity);

		if (orderedCommands.length !== unorderedCommands.length) {
			throw new Error('Unexpected number of commands found in transaction data');
		}

		if (orderedInputs.length !== unorderedInputs.length) {
			throw new Error('Unexpected number of inputs found in transaction data');
		}

		const filteredCommands = orderedCommands.filter(
			(cmd) => cmd.$Intent?.name !== 'AsyncTransactionThunk',
		);

		this.#data.commands = filteredCommands;
		this.#data.inputs = orderedInputs;
		this.#commandSection = filteredCommands;
		this.#inputSection = orderedInputs;
		this.#availableResults = new Set(filteredCommands.map((_, i) => i));

		function getOriginalIndex(index: number): number {
			const command = unorderedCommands[index];
			if (command.$Intent?.name === 'AsyncTransactionThunk') {
				const result = command.$Intent.data.result as TransactionResult | null;

				if (result == null) {
					throw new Error('AsyncTransactionThunk has not been resolved');
				}

				return getOriginalIndex(result.Result);
			}

			const updated = filteredCommands.indexOf(command);

			if (updated === -1) {
				throw new Error('Unable to find original index for command');
			}

			return updated;
		}

		this.#data.mapArguments((arg) => {
			if (arg.$kind === 'Input') {
				const updated = orderedInputs.indexOf(unorderedInputs[arg.Input]);

				if (updated === -1) {
					throw new Error('Input has not been resolved');
				}

				return { ...arg, Input: updated };
			} else if (arg.$kind === 'Result') {
				const updated = getOriginalIndex(arg.Result);

				return { ...arg, Result: updated };
			} else if (arg.$kind === 'NestedResult') {
				const updated = getOriginalIndex(arg.NestedResult[0]);

				return { ...arg, NestedResult: [updated, arg.NestedResult[1]] };
			}

			return arg;
		});

		for (const [i, cmd] of unorderedCommands.entries()) {
			if (cmd.$Intent?.name === 'AsyncTransactionThunk') {
				try {
					cmd.$Intent.data.resultIndex = getOriginalIndex(i);
				} catch {
					// If async thunk did not return a result, this will error, but is safe to ignore
				}
			}
		}
	}

	async prepareForSerialization(options: SerializeTransactionOptions) {
		await this.#waitForPendingTasks();
		this.#sortCommandsAndInputs();
		const intents = new Set<string>();
		for (const command of this.#data.commands) {
			if (command.$Intent) {
				intents.add(command.$Intent.name);
			}
		}

		const steps = [...this.#serializationPlugins];

		for (const intent of intents) {
			if (options.supportedIntents?.includes(intent)) {
				continue;
			}

			if (!this.#intentResolvers.has(intent)) {
				throw new Error(`Missing intent resolver for ${intent}`);
			}

			steps.push(this.#intentResolvers.get(intent)!);
		}

		steps.push(namedPackagesPlugin());

		await this.#runPlugins(steps, options);
	}
}
