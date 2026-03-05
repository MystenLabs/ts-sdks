// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { DeepBookCompatibleClient } from '../client.js';
import type { BalanceManagerContract } from '../transactions/balanceManager.js';
import type { DeepBookContract } from '../transactions/deepbook.js';
import type { MarginManagerContract } from '../transactions/marginManager.js';
import type { MarginPoolContract } from '../transactions/marginPool.js';
import type { MarginRegistryContract } from '../transactions/marginRegistry.js';
import type { MarginTPSLContract } from '../transactions/marginTPSL.js';
import type { DeepBookConfig } from '../utils/config.js';

export interface QueryContext {
	client: DeepBookCompatibleClient;
	config: DeepBookConfig;
	address: string;
	balanceManager: BalanceManagerContract;
	deepBook: DeepBookContract;
	marginManager: MarginManagerContract;
	marginPool: MarginPoolContract;
	marginRegistry: MarginRegistryContract;
	marginTPSL: MarginTPSLContract;
}

export function formatTokenAmount(rawAmount: bigint, scalar: number, decimals: number): string {
	const scalarBigInt = BigInt(scalar);
	const integerPart = rawAmount / scalarBigInt;
	const fractionalPart = rawAmount % scalarBigInt;

	if (fractionalPart === 0n) {
		return integerPart.toString();
	}

	const scalarDigits = scalar.toString().length - 1;
	const fractionalStr = fractionalPart.toString().padStart(scalarDigits, '0');
	const truncated = fractionalStr.slice(0, decimals);
	const trimmed = truncated.replace(/0+$/, '');

	if (!trimmed) {
		return integerPart.toString();
	}

	return `${integerPart}.${trimmed}`;
}
