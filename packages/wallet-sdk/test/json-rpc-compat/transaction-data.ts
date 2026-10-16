// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Moves builder-style `inputs` and `commands` under the core client's programmable `kind`. */
export function programmableTransactionData<
	T extends { inputs: unknown[]; commands: unknown[]; digest?: string | null },
>({ inputs, commands, digest: _, ...data }: T) {
	return {
		...data,
		kind: { $kind: 'ProgrammableTransaction', ProgrammableTransaction: { inputs, commands } },
	};
}
