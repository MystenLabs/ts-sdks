// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

import * as React from 'react';
import { createComponent } from '@lit/react';
import { DAppKitConnectButton as ConnectButtonElement } from '@mysten/dapp-kit-core/web';
import { useDAppKit } from '../hooks/useDAppKit.js';
import type { ComponentProps } from 'react';

export type ConnectButtonProps = ComponentProps<typeof ConnectButtonComponent>;

const ConnectButtonComponent = createComponent({
	react: React,
	tagName: 'mysten-dapp-kit-connect-button',
	elementClass: ConnectButtonElement,
});

export function ConnectButton({ instance, ...props }: ConnectButtonProps) {
	const dAppKit = useDAppKit(instance);
	return <ConnectButtonComponent {...props} instance={dAppKit} />;
}
