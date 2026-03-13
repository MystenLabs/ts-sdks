// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import { useCurrentClient, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { useEffect } from 'react';

import { isEnokiNetwork } from '../src/index.js';
import { registerEnokiWallets } from '../src/wallet/register.js';

export function RegisterEnokiWallets() {
	const client = useCurrentClient();
	const network = useCurrentNetwork();

	useEffect(() => {
		if (!isEnokiNetwork(network)) return;

		const { unregister } = registerEnokiWallets({
			apiKey: 'enoki_public_59ea3ba7809a40bcf25fa030374dd877',
			providers: {
				google: {
					clientId: '589373200629-hkivgs1i0cjcbl0g40b0n3vp8b8b7vhp.apps.googleusercontent.com',
				},
				facebook: {
					clientId: '589373200629-hkivgs1i0cjcbl0g40b0n3vp8b8b7vhp.apps.googleusercontent.com',
				},
				twitch: {
					clientId: '589373200629-hkivgs1i0cjcbl0g40b0n3vp8b8b7vhp.apps.googleusercontent.com',
				},
			},
			client: client as never,
			network,
		});

		return unregister;
	}, [client, network]);

	return null;
}
