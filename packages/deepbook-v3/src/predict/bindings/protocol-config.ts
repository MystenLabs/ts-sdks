// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

// The public `protocolConfigMoveCalls`: the generated `protocol_config` bindings, with the
// argument keys the retired EWMA setters shipped with (see `rename.ts`).

import * as generated from '../../contracts/deepbook_predict/protocol_config.js';
import type { RawTransactionArgument } from '../../contracts/utils/index.js';
import { renameArguments } from './rename.js';

export * from '../../contracts/deepbook_predict/protocol_config.js';

const EWMA_KEYS = {
	config: 'Config',
	alpha: 'Alpha',
	zScoreThreshold: 'ZScoreThreshold',
	penaltyRate: 'PenaltyRate',
	enabled: 'Enabled',
} as const;

export interface SetEwmaParamsArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	alpha: RawTransactionArgument<number | bigint>;
	zScoreThreshold: RawTransactionArgument<number | bigint>;
	penaltyRate: RawTransactionArgument<number | bigint>;
}
export interface SetEwmaParamsOptions extends Omit<generated.SetEwmaParamsOptions, 'arguments'> {
	arguments: SetEwmaParamsArguments;
}
/**
 * @deprecated Retired with instant trading: queued fills charge no congestion penalty, and
 * Predict v4 always aborts it (`EEwmaRetired`).
 */
export function setEwmaParams(options: SetEwmaParamsOptions) {
	return generated.setEwmaParams({
		...options,
		arguments: renameArguments(options.arguments, EWMA_KEYS),
	});
}

export interface SetEwmaEnabledArguments {
	config?: RawTransactionArgument<string>;
	AdminCap: RawTransactionArgument<string>;
	enabled: RawTransactionArgument<boolean>;
}
export interface SetEwmaEnabledOptions extends Omit<generated.SetEwmaEnabledOptions, 'arguments'> {
	arguments: SetEwmaEnabledArguments;
}
/**
 * @deprecated Retired with instant trading: queued fills charge no congestion penalty, and
 * Predict v4 always aborts it (`EEwmaRetired`).
 */
export function setEwmaEnabled(options: SetEwmaEnabledOptions) {
	return generated.setEwmaEnabled({
		...options,
		arguments: renameArguments(options.arguments, EWMA_KEYS),
	});
}
