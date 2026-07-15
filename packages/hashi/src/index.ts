// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export { HashiClient, hashi } from './client.js';
export {
	AmountBelowMinimumError,
	HashiConfigError,
	HashiFetchError,
	HashiGuardianError,
	HashiPausedError,
	InvalidBitcoinAddressError,
	InvalidParamsError,
} from './errors.js';
export type { AmountViolation, GuardianErrorCode, InvalidBitcoinAddressCode } from './errors.js';
export {
	arkworksToSec1Compressed,
	bitcoinAddressToWitnessProgram,
	deriveChildPubkey,
	generateDepositAddress,
	twoOfTwoTaprootScriptPathAddress,
	witnessProgramToAddress,
} from './bitcoin.js';
export type { DepositAddressInputs } from './bitcoin.js';
export { estimateWaitSecs, fetchGuardianInfo, projectCapacity } from './guardian.js';
export type {
	BitcoinNetwork,
	CancelWithdrawalParams,
	DepositFees,
	DepositHistoryItem,
	DepositInfo,
	DepositParams,
	DepositStatus,
	GovernanceConfig,
	GuardianInfoProvider,
	GuardianLimiterConfig,
	GuardianLimiterRaw,
	GuardianLimiterSnapshot,
	GuardianLimiterState,
	GuardianWithdrawCheck,
	HashiClientOptions,
	HbtcBalance,
	NetworkConfig,
	RawGuardianInfo,
	SuiNetwork,
	TransactionHistoryItem,
	UtxoId,
	UtxoLookupResult,
	UtxoOutput,
	UtxoUsageResult,
	WaitOptions,
	WithdrawalFees,
	WithdrawalHistoryItem,
	WithdrawalInfo,
	WithdrawalParams,
	WithdrawalStatus,
} from './types.js';
