// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export { createSponsor, Sponsor } from './sponsor.js';
export type {
	CreateSponsorOptions,
	SponsorOptions,
	SponsorProvidedOptions,
	ValidationOptionsArg,
	ValidateItem,
	SponsorDelayConfig,
	DelaySpec,
	SponsoredTransaction,
	SignTransactionResult,
	SignAndExecuteResult,
	TransactionInput,
	SignOptions,
	SignAndExecuteOptions,
} from './sponsor.js';

export { SponsorValidationError } from './validation.js';
export type {
	Validator,
	SponsorRejection,
	SponsorRejectionReason,
	ValidationIssue,
	TransactionData,
} from './validation.js';

export {
	defaults,
	validSender,
	onlyAddressBalanceGas,
	userSignatureMatchesSender,
	gasCoinNotUsed,
	onlySenderWithdrawals,
	gasBudget,
	allowedPackages,
	allowedFunctions,
	simulationSucceeds,
	boundedExpiration,
	currentEpoch,
} from './validators.js';
export type { AnalyzerMap, AnalysisResults } from './validators.js';

// Re-export the analyzer toolkit so authoring/composing validators is a single import.
export { analyze, analyzers, createAnalyzer } from '@mysten/wallet-sdk';
export type { Analyzer, AnalyzerResult } from '@mysten/wallet-sdk';
