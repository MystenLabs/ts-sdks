// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export { createSponsor, Sponsor } from './sponsor.js';
export type {
	CreateSponsorOptions,
	SponsorOptions,
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
	SponsorValidationKind,
	ValidationIssue,
	TransactionData,
} from './validation.js';

export {
	defaults,
	senderIsNotSponsor,
	gasCoinNotUsed,
	gasBudget,
	allowedPackages,
	allowedFunctions,
	simulationSucceeds,
	boundedExpiration,
} from './validators.js';

export { currentEpoch } from './analysis.js';
export type { AnalyzerMap, AnalysisResults } from './analysis.js';

// Re-export the analyzer toolkit so authoring/composing validators is a single import.
export { analyze, analyzers, createAnalyzer } from '@mysten/wallet-sdk';
export type { Analyzer, AnalyzerResult } from '@mysten/wallet-sdk';
