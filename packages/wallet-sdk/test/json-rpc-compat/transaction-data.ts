// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

/** Adds the core client's programmable `kind` to builder-style `inputs` and `commands`. */
export function programmableTransactionData<
	T extends { inputs: unknown[]; commands: unknown[]; digest?: string | null },
>({ inputs, commands, digest: _, ...data }: T) {
	return {
		...data,
		inputs,
		commands,
		kind: { $kind: 'ProgrammableTransaction', ProgrammableTransaction: { inputs, commands } },
	};
}
