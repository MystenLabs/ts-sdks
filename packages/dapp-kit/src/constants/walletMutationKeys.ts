// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import type { MutationKey } from '@tanstack/react-query';

type MutationKeyFn = (additionalKeys?: MutationKey) => MutationKey;

export const walletMutationKeys: {
	all: { baseScope: string };
	connectWallet: MutationKeyFn;
	autoconnectWallet: MutationKeyFn;
	disconnectWallet: MutationKeyFn;
	signPersonalMessage: MutationKeyFn;
	signTransaction: MutationKeyFn;
	signAndExecuteTransaction: MutationKeyFn;
	switchAccount: MutationKeyFn;
} = {
	all: { baseScope: 'wallet' },
	connectWallet: formMutationKeyFn('connect-wallet'),
	autoconnectWallet: formMutationKeyFn('autoconnect-wallet'),
	disconnectWallet: formMutationKeyFn('disconnect-wallet'),
	signPersonalMessage: formMutationKeyFn('sign-personal-message'),
	signTransaction: formMutationKeyFn('sign-transaction'),
	signAndExecuteTransaction: formMutationKeyFn('sign-and-execute-transaction'),
	switchAccount: formMutationKeyFn('switch-account'),
};

function formMutationKeyFn(baseEntity: string): MutationKeyFn {
	return function mutationKeyFn(additionalKeys: MutationKey = []): MutationKey {
		return [{ ...walletMutationKeys.all, baseEntity }, ...additionalKeys];
	};
}
