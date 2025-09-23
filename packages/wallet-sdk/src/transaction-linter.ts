// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '@mysten/sui/bcs';
import type { SuiClient, DryRunTransactionBlockResponse } from '@mysten/sui/client';
import type { ClientWithCoreApi, Experimental_SuiClientTypes } from '@mysten/sui/experimental';
import type { Transaction } from '@mysten/sui/transactions';
import type { Argument } from '@mysten/sui/transactions';
import {
	fromBase64,
	normalizeStructTag,
	normalizeSuiAddress,
	parseStructTag,
} from '@mysten/sui/utils';

const Balance = bcs.struct('Balance', {
	value: bcs.u64(),
});

export const CoinStruct = bcs.struct('Coin', {
	id: bcs.Address,
	balance: Balance,
});

class MaybeCoin {
	type: string;
	balance: bigint;

	/** True if the coin is either transferred to an address that is not the sender, or is passed to a move call */
	consumed = false;

	constructor(type: string, balance: string | number | bigint) {
		const structTag = parseStructTag(type);
		const coinType =
			structTag.address === normalizeSuiAddress('0x2') &&
			structTag.module === 'coin' &&
			structTag.name === 'Coin'
				? normalizeStructTag(structTag.typeParams[0])
				: normalizeStructTag(structTag);

		this.type = coinType;
		this.balance = BigInt(balance);
	}
}

function getNodeId(arg: Argument) {
	switch (arg.$kind) {
		case 'GasCoin':
			return 'gas';
		case 'Input':
			return `input-${arg.Input}`;
		case 'Result':
			return `result-${arg.Result}-0`;
		case 'NestedResult':
			return `result-${arg.NestedResult[0]}-${arg.NestedResult[1]}`;
		default:
			throw new Error(`Unknown argument kind: "${JSON.stringify(arg)}"`);
	}
}

async function parseCoin(object: Experimental_SuiClientTypes.ObjectResponse) {
	if (!object.type.startsWith('0x2::coin::Coin')) {
		return null;
	}

	return CoinStruct.parse(await object.content);
}

export interface TransactionLintResult {
	coins: Map<string, MaybeCoin>;
	usage: Map<string, bigint>;
}

export async function lintTransaction(
	tx: Transaction,
	suiClient: ClientWithCoreApi,
): Promise<TransactionLintResult> {
	const data = tx.getData();
	const coins = new Map<string, MaybeCoin>();

	const gasObject = new MaybeCoin('0x2::coin::Coin<0x2::sui::SUI>', 0);
	coins.set(getNodeId({ $kind: 'GasCoin', GasCoin: true }), gasObject);

	const objectIds = [
		...(data.gasData.payment || []).map((obj) => obj.objectId),
		...data.inputs
			.map((input) => input.Object?.ImmOrOwnedObject?.objectId ?? null)
			.filter((id): id is string => id !== null),
	];

	const { objects: loadedObjects } = await suiClient.core.getObjects({
		objectIds: objectIds,
	});

	const gasPaymentCount = data.gasData.payment?.length || 0;

	// Process gas payment objects
	for (let i = 0; i < gasPaymentCount; i++) {
		const gasObject_response = loadedObjects[i];
		if (gasObject_response instanceof Error) {
			throw gasObject_response;
		}
		const parsedCoin = await parseCoin(gasObject_response);
		if (parsedCoin) {
			gasObject.balance = gasObject.balance + BigInt(parsedCoin.balance.value);
		}
	}

	// Process regular input objects
	let objectInputIndex = 0;
	for (let inputIndex = 0; inputIndex < data.inputs.length; inputIndex++) {
		const input = data.inputs[inputIndex];
		if (input.$kind === 'Object' && input.Object?.$kind === 'ImmOrOwnedObject') {
			const objectResponse = loadedObjects[gasPaymentCount + objectInputIndex];
			if (objectResponse instanceof Error) {
				throw objectResponse;
			}
			const parsedCoin = await parseCoin(objectResponse);
			if (parsedCoin) {
				coins.set(
					getNodeId({ $kind: 'Input', Input: inputIndex }),
					new MaybeCoin(objectResponse.type, BigInt(parsedCoin.balance.value)),
				);
			}
			objectInputIndex++;
		}
	}

	data.commands.forEach((command, index) => {
		switch (command.$kind) {
			case 'SplitCoins': {
				const source = coins.get(getNodeId(command.SplitCoins.coin));

				// This can happen if the coin is the result of a move call:
				if (!source) {
					break;
				}

				const splitAmounts = command.SplitCoins.amounts.map((amount) => {
					if (amount.$kind === 'Input') {
						const input = data.inputs[amount.Input];

						// If the amount isn't a pure value, then we can't determine the split amount:
						if (input.$kind !== 'Pure') {
							return source.balance;
						}

						return bcs.u64().parse(new Uint8Array(fromBase64(input.Pure.bytes)));
					} else {
						return source.balance;
					}
				});

				splitAmounts.forEach((amount, resultIndex) => {
					const resultNode = getNodeId({
						$kind: 'NestedResult',
						NestedResult: [index, resultIndex],
					});

					source.balance = source.balance - BigInt(amount);

					coins.set(resultNode, new MaybeCoin(source.type, BigInt(amount)));
				});

				break;
			}

			case 'MergeCoins': {
				const resultId = getNodeId({ $kind: 'Result', Result: index });
				const destinationId = getNodeId(command.MergeCoins.destination);
				const destination = coins.get(destinationId);

				// This can happen if the destination is the result of a move call:
				if (!destination) {
					break;
				}

				command.MergeCoins.sources.forEach((source) => {
					const sourceId = getNodeId(source);
					const sourceCoin = coins.get(sourceId);

					if (sourceCoin) {
						destination.balance = destination.balance + sourceCoin.balance;
						sourceCoin.balance = 0n;
					}
				});

				coins.set(resultId, destination);

				break;
			}

			case 'TransferObjects': {
				const destinationArg = command.TransferObjects.address;
				if (
					destinationArg.$kind === 'Input' &&
					data.inputs[destinationArg.Input] &&
					data.inputs[destinationArg.Input].$kind === 'Pure'
				) {
					const destinationAddress = bcs.Address.parse(
						new Uint8Array(fromBase64(data.inputs[destinationArg.Input].Pure!.bytes)),
					);

					// We can ignore static transfers to the sender, since we don't consider those assets
					// as "lost", they're in the same wallet.
					if (normalizeSuiAddress(destinationAddress) === normalizeSuiAddress(data.sender!)) {
						break;
					}
				}

				command.TransferObjects.objects.forEach((object) => {
					const node = getNodeId(object);
					const coin = coins.get(node);

					if (coin) {
						coin.consumed = true;
					}
				});

				break;
			}

			case 'MoveCall': {
				command.MoveCall.arguments.forEach((object) => {
					const node = getNodeId(object);
					const coin = coins.get(node);

					if (coin) {
						coin.consumed = true;
					}
				});

				break;
			}

			case 'MakeMoveVec': {
				command.MakeMoveVec.elements.forEach((object) => {
					const node = getNodeId(object);
					const coin = coins.get(node);

					if (coin) {
						coin.consumed = true;
					}
				});
				break;
			}

			case 'Publish':
			case 'Upgrade':
			case '$Intent':
				// Intents are informational and don't affect coin flows directly
				break;

			default:
				throw new Error(`Unknown command kind: "${(command as { $kind: string }).$kind}"`);
		}
	});

	const usage = new Map<string, bigint>();
	const uniqueCoins = new Set(coins.values());
	for (const coin of uniqueCoins) {
		if (coin.consumed) {
			usage.set(coin.type, (usage.get(coin.type) || 0n) + coin.balance);
		}
	}

	return {
		coins,
		usage,
	};
}

export interface CoinFlow {
	coinType: string;
	amount: string;
	decimals: number;
	symbol: string;
	isRecognized: boolean;
}

export interface CoinFlows {
	outflows: CoinFlow[];
	inflows: CoinFlow[];
}

/**
 * Fetch coin metadata for a given coin type
 */
async function getCoinMetadata(coinType: string, suiClient: ClientWithCoreApi) {
	// SUI is special case - we know its metadata (handle both normalized and short form)
	if (
		coinType === '0x2::sui::SUI' ||
		coinType === '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI'
	) {
		return {
			decimals: 9,
			symbol: 'SUI',
			isRecognized: true,
		};
	}

	try {
		// Try to fetch coin metadata object
		// TODO: get this through the core api
		const metadata = await (suiClient as SuiClient).getCoinMetadata({ coinType });

		if (metadata && metadata.decimals !== null && metadata.decimals !== undefined) {
			return {
				decimals: metadata.decimals,
				symbol: metadata.symbol || 'UNKNOWN',
				isRecognized: true,
			};
		}
	} catch (error) {
		console.warn(`Failed to fetch metadata for ${coinType}:`, error);
	}

	// Fallback for unrecognized coins
	const parts = coinType.split('::');
	const fallbackSymbol = parts.length >= 2 ? parts[parts.length - 1].toUpperCase() : 'UNKNOWN';

	return {
		decimals: 6, // Common default for many tokens
		symbol: fallbackSymbol,
		isRecognized: false,
	};
}

/**
 * Extract coin flows from a transaction
 */
export async function extractCoinFlows(
	tx: Transaction,
	suiClient: ClientWithCoreApi,
	dryRun?: DryRunTransactionBlockResponse,
): Promise<CoinFlows> {
	const lintResult = await lintTransaction(tx, suiClient);
	const data = tx.getData();

	// Add gas budget to usage - this represents the maximum SUI that could be consumed
	const allUsage = new Map(lintResult.usage);
	const suiCoinType = normalizeStructTag('0x2::sui::SUI');
	const gasBudget = data.gasData.budget ? BigInt(data.gasData.budget) : 0n;

	// Ensure we only have one SUI entry by aggregating all SUI usage
	// Need to check for different representations of SUI coin type
	let totalSuiUsage = 0n;
	const suiEntriesToRemove: string[] = [];

	for (const [coinType, amount] of allUsage.entries()) {
		// Normalize the coin type to check if it's SUI
		const normalizedCoinType = normalizeStructTag(coinType);
		if (normalizedCoinType === suiCoinType) {
			totalSuiUsage += amount;
			suiEntriesToRemove.push(coinType);
		}
	}

	// Remove all SUI entries
	suiEntriesToRemove.forEach((coinType) => allUsage.delete(coinType));

	// Add total SUI usage including gas budget
	if (totalSuiUsage > 0n || gasBudget > 0n) {
		allUsage.set(suiCoinType, totalSuiUsage + gasBudget);
	}

	// Get metadata for all coin types in parallel
	const coinTypes = Array.from(allUsage.keys());
	const metadataPromises = coinTypes.map((coinType) => getCoinMetadata(coinType, suiClient));
	const metadataResults = await Promise.all(metadataPromises);

	// Create map of coin type to metadata
	const metadataMap = new Map<string, Awaited<ReturnType<typeof getCoinMetadata>>>();
	coinTypes.forEach((coinType, index) => {
		metadataMap.set(coinType, metadataResults[index]);
	});

	const outflows: CoinFlow[] = Array.from(allUsage.entries()).map(([coinType, amount]) => {
		const metadata = metadataMap.get(coinType);
		if (!metadata) {
			throw new Error(`Failed to retrieve metadata for coin type: ${coinType}`);
		}

		return {
			coinType,
			amount: amount.toString(),
			decimals: metadata.decimals,
			symbol: metadata.symbol,
			isRecognized: metadata.isRecognized,
		};
	});

	// Extract inflows from dry run if available
	const inflows: CoinFlow[] = [];
	if (dryRun) {
		const signerAddress = data.sender;
		if (signerAddress) {
			const dryRunInflows = extractInflowsFromDryRun(dryRun, signerAddress);

			// Get metadata for inflow coin types
			const inflowCoinTypes = dryRunInflows.map((flow) => flow.coinType);
			const inflowMetadataPromises = inflowCoinTypes.map((coinType) =>
				getCoinMetadata(coinType, suiClient),
			);
			const inflowMetadataResults = await Promise.all(inflowMetadataPromises);

			// Create inflow entries with metadata
			dryRunInflows.forEach((flow, index) => {
				const metadata = inflowMetadataResults[index];
				if (metadata) {
					inflows.push({
						coinType: flow.coinType,
						amount: flow.amount,
						decimals: metadata.decimals,
						symbol: metadata.symbol,
						isRecognized: metadata.isRecognized,
					});
				}
			});
		}
	}

	return {
		outflows,
		inflows,
	};
}

/**
 * Extract inflows from dry run balance changes
 */
function extractInflowsFromDryRun(
	dryRun: DryRunTransactionBlockResponse,
	signerAddress: string,
): { coinType: string; amount: string }[] {
	if (!dryRun.balanceChanges) {
		return [];
	}

	// Find positive balance changes for the signer (these are inflows)
	return dryRun.balanceChanges
		.filter((change) => {
			// Check if this balance change is for the signer
			const owner = getOwnerAddress(change.owner);
			if (!owner || normalizeSuiAddress(owner) !== normalizeSuiAddress(signerAddress)) {
				return false;
			}

			// Only include positive changes (inflows)
			return BigInt(change.amount) > 0n;
		})
		.map((change) => ({
			coinType: change.coinType,
			amount: change.amount,
		}));
}

/**
 * Extract owner address from balance change owner object
 */
function getOwnerAddress(owner: any): string | null {
	if (typeof owner === 'string') {
		return owner;
	}
	if (owner?.AddressOwner) {
		return owner.AddressOwner;
	}
	if (owner?.ObjectOwner) {
		return owner.ObjectOwner;
	}
	return null;
}
