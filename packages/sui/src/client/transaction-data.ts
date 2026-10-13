// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { bcs } from '../bcs/index.js';
import { TransactionDataBuilder } from '../transactions/TransactionData.js';
import type { SuiClientTypes } from './types.js';

/** Decode ledger transaction data, normalizing the inputs and commands of programmable kinds. */
export function parseTransactionDataBcs(bytes: Uint8Array): SuiClientTypes.TransactionData {
	const data = bcs.TransactionData.parse(bytes).V1;
	const programmable = data.kind.ProgrammableTransaction ?? data.kind.ProgrammableSystemTransaction;
	const { version, sender, gasData, expiration, inputs, commands } = TransactionDataBuilder.restore(
		{
			version: 2,
			sender: data.sender,
			gasData: data.gasData,
			expiration: data.expiration,
			inputs: programmable?.inputs ?? [],
			commands: programmable?.commands ?? [],
		},
	).snapshot();
	const body = { inputs, commands };
	const kind: SuiClientTypes.TransactionKind =
		data.kind.$kind === 'ProgrammableTransaction'
			? { $kind: 'ProgrammableTransaction', ProgrammableTransaction: body }
			: data.kind.$kind === 'ProgrammableSystemTransaction'
				? { $kind: 'ProgrammableSystemTransaction', ProgrammableSystemTransaction: body }
				: data.kind;

	return { version, sender, gasData, expiration, kind };
}
